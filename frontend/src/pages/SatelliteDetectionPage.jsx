/**
 * Satellite Tree Detection
 * 1. User draws a rectangle on the Leaflet map
 * 2. We fetch satellite tiles from OpenStreetMap and stitch into one image
 * 3. Send to Hugging Face YOLO model for tree detection
 * 4. Convert pixel bounding boxes → GPS coordinates
 * 5. Show results overlay + bulk import to registry
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Rectangle, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'
import toast from 'react-hot-toast'
import {
  Satellite, MousePointer, Loader2, Trees, CheckCircle,
  AlertTriangle, RotateCcw, Download, Info, Zap
} from 'lucide-react'

const HF_API_URL = 'https://api-inference.huggingface.co/models/Zigeng/SlimSAM-uniform-77'
const HF_YOLO_URL = 'https://api-inference.huggingface.co/models/microsoft/table-transformer-detection'

// Steps
const STEPS = {
  DRAW: 'draw',
  DETECTING: 'detecting',
  RESULTS: 'results',
  IMPORTING: 'importing',
  DONE: 'done',
}

// ── Tile math helpers ──────────────────────────────────────────────────────
function latLngToTile(lat, lng, zoom) {
  const n = Math.pow(2, zoom)
  const x = Math.floor((lng + 180) / 360 * n)
  const latRad = lat * Math.PI / 180
  const y = Math.floor((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n)
  return { x, y }
}

function tileToLatLng(x, y, zoom) {
  const n = Math.pow(2, zoom)
  const lng = x / n * 360 - 180
  const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)))
  const lat = latRad * 180 / Math.PI
  return { lat, lng }
}

function pixelToLatLng(px, py, canvasW, canvasH, bounds) {
  const { north, south, east, west } = bounds
  const lat = north - (py / canvasH) * (north - south)
  const lng = west + (px / canvasW) * (east - west)
  return { lat, lng }
}

// ── Fetch and stitch satellite tiles ──────────────────────────────────────
async function fetchSatelliteTiles(bounds, zoom = 17) {
  const { north, south, east, west } = bounds
  const topLeft = latLngToTile(north, west, zoom)
  const bottomRight = latLngToTile(south, east, zoom)

  const tilesX = bottomRight.x - topLeft.x + 1
  const tilesY = bottomRight.y - topLeft.y + 1

  // Limit to reasonable area
  if (tilesX * tilesY > 16) {
    throw new Error('Area too large — please draw a smaller rectangle (max ~500m × 500m)')
  }

  const TILE_SIZE = 256
  const canvasW = tilesX * TILE_SIZE
  const canvasH = tilesY * TILE_SIZE

  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')

  // Fetch all tiles in parallel
  const promises = []
  for (let tx = topLeft.x; tx <= bottomRight.x; tx++) {
    for (let ty = topLeft.y; ty <= bottomRight.y; ty++) {
      const px = (tx - topLeft.x) * TILE_SIZE
      const py = (ty - topLeft.y) * TILE_SIZE
      // Use OpenStreetMap satellite-style via ESRI (public, free)
      const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${ty}/${tx}`
      promises.push(
        fetch(url)
          .then(r => r.blob())
          .then(blob => new Promise((resolve, reject) => {
            const img = new Image()
            img.onload = () => { ctx.drawImage(img, px, py); resolve() }
            img.onerror = reject
            img.src = URL.createObjectURL(blob)
          }))
      )
    }
  }

  await Promise.all(promises)

  // Calculate actual bounds of stitched image
  const actualBounds = {
    north: tileToLatLng(topLeft.x, topLeft.y, zoom).lat,
    west: tileToLatLng(topLeft.x, topLeft.y, zoom).lng,
    south: tileToLatLng(bottomRight.x + 1, bottomRight.y + 1, zoom).lat,
    east: tileToLatLng(bottomRight.x + 1, bottomRight.y + 1, zoom).lng,
  }

  return {
    canvas,
    base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1],
    width: canvasW,
    height: canvasH,
    bounds: actualBounds,
  }
}

// ── Call Hugging Face directly from browser ───────────────────────────────
async function detectTreesHF(base64Image, hfToken) {
  const url = 'https://api-inference.huggingface.co/models/facebook/detr-resnet-50'

  const binary = atob(base64Image)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  const blob = new Blob([bytes], { type: 'image/jpeg' })

  const headers = { 'Content-Type': 'image/jpeg' }
  if (hfToken) headers['Authorization'] = `Bearer ${hfToken}`

  const resp = await fetch(url, { method: 'POST', headers, body: blob })

  if (resp.status === 503) {
    // Model cold start — wait and retry once
    await new Promise(r => setTimeout(r, 10000))
    const retry = await fetch(url, { method: 'POST', headers, body: blob })
    if (!retry.ok) throw new Error(`HF API error: ${retry.status} — try again in 30s`)
    return retry.json()
  }

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`HF API error ${resp.status}: ${err}`)
  }
  return resp.json()
}

// Filter detections to likely trees/vegetation
function filterTreeDetections(detections, imgW, imgH) {
  const TREE_LABELS = ['tree', 'plant', 'potted plant', 'broccoli', 'bush', 'shrub', 'palm tree', 'flower']
  // For satellite imagery, we use a heuristic: look for roughly circular
  // mid-sized objects (tree canopies are 5-20% of image width typically)
  return detections
    .filter(d => {
      const label = d.label?.toLowerCase() || ''
      const score = d.score || 0
      const box = d.box || {}
      const w = (box.xmax - box.xmin) / imgW
      const h = (box.ymax - box.ymin) / imgH
      const isVegetation = TREE_LABELS.some(t => label.includes(t))
      const isReasonableSize = w > 0.02 && w < 0.4 && h > 0.02 && h < 0.4
      // Accept vegetation labels OR any detection with reasonable canopy-like size + good confidence
      return (isVegetation || (score > 0.7 && isReasonableSize)) && score > 0.4
    })
    .map(d => ({
      ...d,
      // Center of bounding box = tree trunk position estimate
      cx: ((d.box.xmin + d.box.xmax) / 2),
      cy: ((d.box.ymin + d.box.ymax) / 2),
    }))
}

// ── Draw detections on canvas ──────────────────────────────────────────────
function drawDetections(canvas, detections) {
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = '#22c55e'
  ctx.lineWidth = 3
  ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'
  ctx.font = 'bold 12px sans-serif'

  detections.forEach((d, i) => {
    const { xmin, ymin, xmax, ymax } = d.box
    ctx.fillRect(xmin, ymin, xmax - xmin, ymax - ymin)
    ctx.strokeRect(xmin, ymin, xmax - xmin, ymax - ymin)

    // Label
    ctx.fillStyle = '#16a34a'
    ctx.fillRect(xmin, ymin - 18, 60, 18)
    ctx.fillStyle = '#fff'
    ctx.fillText(`🌳 ${Math.round(d.score * 100)}%`, xmin + 3, ymin - 4)
    ctx.fillStyle = 'rgba(34, 197, 94, 0.15)'
  })
  return canvas.toDataURL()
}

// ── Rectangle Draw Tool ───────────────────────────────────────────────────
function RectangleDraw({ onBoundsSet, drawing }) {
  const [start, setStart] = useState(null)
  const [current, setCurrent] = useState(null)
  const map = useMap()

  useMapEvents({
    mousedown(e) {
      if (!drawing) return
      map.dragging.disable()
      setStart(e.latlng)
      setCurrent(e.latlng)
    },
    mousemove(e) {
      if (!drawing || !start) return
      setCurrent(e.latlng)
    },
    mouseup(e) {
      if (!drawing || !start) return
      map.dragging.enable()
      const bounds = {
        north: Math.max(start.lat, e.latlng.lat),
        south: Math.min(start.lat, e.latlng.lat),
        east: Math.max(start.lng, e.latlng.lng),
        west: Math.min(start.lng, e.latlng.lng),
      }
      onBoundsSet(bounds)
      setStart(null)
      setCurrent(null)
    },
  })

  if (!start || !current) return null
  const bounds = [
    [Math.min(start.lat, current.lat), Math.min(start.lng, current.lng)],
    [Math.max(start.lat, current.lat), Math.max(start.lng, current.lng)],
  ]
  return <Rectangle bounds={bounds} pathOptions={{ color: '#7c3aed', weight: 2, dashArray: '6 4', fillOpacity: 0.1 }} />
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function SatelliteDetectionPage() {
  const [step, setStep] = useState(STEPS.DRAW)
  const [drawing, setDrawing] = useState(false)
  const [selectedBounds, setSelectedBounds] = useState(null)
  const [resultImage, setResultImage] = useState(null)
  const [detections, setDetections] = useState([])
  const [treeCoords, setTreeCoords] = useState([])
  const [imageMeta, setImageMeta] = useState(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [hfToken, setHfToken] = useState(import.meta.env.VITE_HF_TOKEN || '')
  const canvasRef = useRef(null)

  const handleBoundsSet = useCallback((bounds) => {
    setSelectedBounds(bounds)
    setDrawing(false)
  }, [])

  const reset = () => {
    setStep(STEPS.DRAW)
    setDrawing(false)
    setSelectedBounds(null)
    setResultImage(null)
    setDetections([])
    setTreeCoords([])
    setImageMeta(null)
    setImportResult(null)
    setStatusMsg('')
  }

  const runDetection = async () => {
    if (!selectedBounds) return
    setStep(STEPS.DETECTING)

    try {
      // Step 1: Fetch satellite tiles
      setStatusMsg('📡 Fetching satellite imagery...')
      const imageData = await fetchSatelliteTiles(selectedBounds, 17)
      setImageMeta(imageData)

      // Step 2: Run detection via backend proxy
      setStatusMsg('🤖 Running AI tree detection (may take 10-20s on first run)...')
      const raw = await detectTreesHF(imageData.base64, hfToken)

      if (!Array.isArray(raw)) {
        throw new Error(raw?.error || 'Unexpected response from detection model')
      }

      // Step 3: Filter to trees
      setStatusMsg('🌳 Filtering vegetation detections...')
      const trees = filterTreeDetections(raw, imageData.width, imageData.height)

      // Step 4: Draw boxes on image
      const annotatedUrl = drawDetections(imageData.canvas, trees)
      setResultImage(annotatedUrl)
      setDetections(trees)

      // Step 5: Convert pixel coords → GPS
      const coords = trees.map(d => ({
        ...pixelToLatLng(d.cx, d.cy, imageData.width, imageData.height, imageData.bounds),
        confidence: d.score,
        label: d.label,
      }))
      setTreeCoords(coords)

      setStep(STEPS.RESULTS)
      setStatusMsg('')

    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Detection failed')
      setStep(STEPS.DRAW)
      setStatusMsg('')
    }
  }

  const importTrees = async () => {
    if (!treeCoords.length) return
    setStep(STEPS.IMPORTING)
    try {
      const res = await api.post('/trees/bulk-create/', {
        trees: treeCoords.map(c => ({
          latitude: c.lat,
          longitude: c.lng,
          confidence: c.confidence,
        })),
        source: 'satellite_detection',
      })
      setImportResult(res.data)
      setStep(STEPS.DONE)
      toast.success(`✅ ${res.data.created} trees imported to registry!`)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed')
      setStep(STEPS.RESULTS)
    }
  }

  const boundsArea = selectedBounds ? (
    Math.abs(selectedBounds.north - selectedBounds.south) * 111 *
    Math.abs(selectedBounds.east - selectedBounds.west) * 111 *
    Math.cos(selectedBounds.north * Math.PI / 180)
  ).toFixed(3) : null

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Satellite size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-gray-900 text-sm">Satellite Tree Detection</h1>
            <p className="text-xs text-gray-500">Draw an area on the map → AI detects trees → auto-import to registry</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {step !== STEPS.DRAW && (
            <button onClick={reset} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <RotateCcw size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[12.9716, 77.5946]}
            zoom={14}
            className="w-full h-full"
            style={{ cursor: drawing ? 'crosshair' : 'grab' }}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri'
              maxZoom={19}
            />
            <RectangleDraw onBoundsSet={handleBoundsSet} drawing={drawing} />
            {selectedBounds && !drawing && (
              <Rectangle
                bounds={[
                  [selectedBounds.south, selectedBounds.west],
                  [selectedBounds.north, selectedBounds.east],
                ]}
                pathOptions={{ color: '#7c3aed', weight: 2, fillOpacity: 0.1 }}
              />
            )}
          </MapContainer>

          {/* Draw instruction overlay */}
          {step === STEPS.DRAW && !selectedBounds && !drawing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl px-8 py-6 text-center max-w-sm mx-4">
                <MousePointer size={36} className="mx-auto text-violet-600 mb-3" />
                <h2 className="font-bold text-gray-900 mb-1">Draw Detection Area</h2>
                <p className="text-sm text-gray-500">Click "Start Drawing" then drag on the satellite map to select an area</p>
              </div>
            </div>
          )}

          {/* Drawing active overlay */}
          {drawing && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
              🖱️ Click and drag to draw rectangle
            </div>
          )}

          {/* Detecting overlay */}
          {step === STEPS.DETECTING && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-2xl shadow-2xl px-8 py-8 text-center max-w-sm mx-4">
                <Loader2 size={40} className="animate-spin text-violet-600 mx-auto mb-4" />
                <h2 className="font-bold text-gray-900 mb-2">Detecting Trees...</h2>
                <p className="text-sm text-gray-500">{statusMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className="w-80 bg-white border-l border-gray-100 flex flex-col overflow-y-auto shrink-0">
          <div className="p-4 space-y-4 flex-1">

            {/* Step 1: Draw */}
            {(step === STEPS.DRAW || step === STEPS.DETECTING) && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold">1</span>
                    Select Area
                  </h3>
                  <button
                    onClick={() => { setDrawing(true); setSelectedBounds(null) }}
                    disabled={step === STEPS.DETECTING}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${drawing
                        ? 'bg-violet-600 text-white'
                        : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'}`}
                  >
                    <MousePointer size={15} />
                    {drawing ? 'Drawing... (drag on map)' : 'Start Drawing'}
                  </button>
                </div>

                {selectedBounds && (
                  <div className="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs space-y-1">
                    <div className="font-semibold text-violet-800 mb-1.5">✅ Area Selected</div>
                    <div className="text-violet-700">N: {selectedBounds.north.toFixed(5)}</div>
                    <div className="text-violet-700">S: {selectedBounds.south.toFixed(5)}</div>
                    <div className="text-violet-700">E: {selectedBounds.east.toFixed(5)}</div>
                    <div className="text-violet-700">W: {selectedBounds.west.toFixed(5)}</div>
                    <div className="font-semibold text-violet-800 mt-1">~{boundsArea} km²</div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center font-bold">2</span>
                    Run Detection
                  </h3>
                  <button
                    onClick={runDetection}
                    disabled={!selectedBounds || step === STEPS.DETECTING}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {step === STEPS.DETECTING
                      ? <><Loader2 size={15} className="animate-spin" /> Detecting...</>
                      : <><Zap size={15} /> Detect Trees with AI</>}
                  </button>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-2">
                    <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700">
                      <strong>Tips for best results:</strong>
                      <ul className="mt-1 space-y-1">
                        <li>• Zoom in to a tree-dense area first</li>
                        <li>• Draw a small area (100m × 100m works best)</li>
                        <li>• Areas with clear canopy separation detect better</li>
                        <li>• First run may take 20-30s (model warmup)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Results */}
            {(step === STEPS.RESULTS || step === STEPS.IMPORTING) && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Detection Results</h3>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                    {detections.length} trees found
                  </span>
                </div>

                {resultImage && (
                  <div className="rounded-xl overflow-hidden border border-gray-200">
                    <img src={resultImage} alt="Detection results" className="w-full" />
                  </div>
                )}

                <div className="space-y-2">
                  {detections.slice(0, 6).map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">🌳 {d.label || 'Tree'} #{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">{treeCoords[i] ? `${treeCoords[i].lat.toFixed(4)}, ${treeCoords[i].lng.toFixed(4)}` : ''}</span>
                        <span className={`font-semibold ${d.score > 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                          {Math.round(d.score * 100)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {detections.length > 6 && (
                    <p className="text-xs text-gray-400 text-center">+{detections.length - 6} more...</p>
                  )}
                </div>

                {detections.length === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center">
                    <AlertTriangle size={24} className="mx-auto text-amber-500 mb-2" />
                    <p className="text-sm font-medium text-amber-800">No trees detected</p>
                    <p className="text-xs text-amber-600 mt-1">Try a smaller area with denser tree coverage, or adjust zoom level</p>
                  </div>
                )}

                {detections.length > 0 && (
                  <button
                    onClick={importTrees}
                    disabled={step === STEPS.IMPORTING}
                    className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {step === STEPS.IMPORTING
                      ? <><Loader2 size={15} className="animate-spin" /> Importing...</>
                      : <><Download size={15} /> Import {treeCoords.length} Trees to Registry</>}
                  </button>
                )}
              </>
            )}

            {/* Done */}
            {step === STEPS.DONE && importResult && (
              <div className="text-center py-6 space-y-4">
                <CheckCircle size={48} className="mx-auto text-green-500" />
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{importResult.created} Trees Imported!</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    All trees have been added to the registry with auto-generated tags and GPS coordinates
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-left space-y-1">
                  {importResult.trees?.slice(0, 4).map((t, i) => (
                    <div key={i} className="text-xs text-green-700">
                      ✅ {t.tag_number} → {t.zone} ({t.latitude.toFixed(4)}, {t.longitude.toFixed(4)})
                    </div>
                  ))}
                  {importResult.created > 4 && (
                    <div className="text-xs text-green-600">+{importResult.created - 4} more...</div>
                  )}
                </div>
                {importResult.skipped > 0 && (
                  <p className="text-xs text-gray-400">{importResult.skipped} low-confidence detections skipped</p>
                )}
                <div className="flex gap-2">
                  <button onClick={reset} className="flex-1 btn-secondary text-sm">
                    Detect More
                  </button>
                  <a href="/trees" className="flex-1 btn-primary text-sm text-center flex items-center justify-center gap-1">
                    <Trees size={14} /> View Registry
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
