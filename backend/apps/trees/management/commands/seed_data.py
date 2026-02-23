"""
Management command to seed the database with demo data.
Run: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import random
from datetime import date, timedelta

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding demo data...')

        # Import here to avoid circular issues
        from apps.zones.models import Zone
        from apps.trees.models import Tree, Species, HealthLog
        from apps.tasks.models import MaintenanceTask

        # Create Zones
        zones_data = [
            {'name': 'North Zone', 'city': 'Bangalore', 'center_lat': 13.0827, 'center_lng': 77.5877, 'area_sq_km': 12.5},
            {'name': 'South Zone', 'city': 'Bangalore', 'center_lat': 12.9121, 'center_lng': 77.6446, 'area_sq_km': 9.8},
            {'name': 'East Zone', 'city': 'Bangalore', 'center_lat': 12.9716, 'center_lng': 77.7236, 'area_sq_km': 11.2},
            {'name': 'West Zone', 'city': 'Bangalore', 'center_lat': 12.9591, 'center_lng': 77.5125, 'area_sq_km': 10.3},
            {'name': 'Central Zone', 'city': 'Bangalore', 'center_lat': 12.9762, 'center_lng': 77.5929, 'area_sq_km': 6.7},
        ]

        zones = []
        for zd in zones_data:
            zone, _ = Zone.objects.get_or_create(name=zd['name'], defaults=zd)
            zones.append(zone)
        self.stdout.write(f'  Created {len(zones)} zones')

        # Create Species
        species_data = [
            {'common_name': 'Neem', 'scientific_name': 'Azadirachta indica', 'watering_frequency_days': 7, 'native': True, 'icon': '🌿'},
            {'common_name': 'Peepal', 'scientific_name': 'Ficus religiosa', 'watering_frequency_days': 5, 'native': True, 'icon': '🌳'},
            {'common_name': 'Gulmohar', 'scientific_name': 'Delonix regia', 'watering_frequency_days': 7, 'native': False, 'icon': '🌺'},
            {'common_name': 'Banyan', 'scientific_name': 'Ficus benghalensis', 'watering_frequency_days': 6, 'native': True, 'icon': '🌲'},
            {'common_name': 'Rain Tree', 'scientific_name': 'Samanea saman', 'watering_frequency_days': 8, 'native': False, 'icon': '🌴'},
            {'common_name': 'Tamarind', 'scientific_name': 'Tamarindus indica', 'watering_frequency_days': 10, 'native': True, 'icon': '🌾'},
            {'common_name': 'Ashoka', 'scientific_name': 'Saraca asoca', 'watering_frequency_days': 5, 'native': True, 'icon': '🌱'},
            {'common_name': 'Silver Oak', 'scientific_name': 'Grevillea robusta', 'watering_frequency_days': 9, 'native': False, 'icon': '🍃'},
        ]

        species_list = []
        for sd in species_data:
            sp, _ = Species.objects.get_or_create(common_name=sd['common_name'], defaults=sd)
            species_list.append(sp)
        self.stdout.write(f'  Created {len(species_list)} species')

        # Create Users
        admin_user, _ = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@treetracker.app',
                'first_name': 'Admin',
                'last_name': 'User',
                'role': 'admin',
                'is_staff': True,
                'is_superuser': True,
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()

        supervisors = []
        for i, zone in enumerate(zones[:3]):
            sup, _ = User.objects.get_or_create(
                username=f'supervisor{i+1}',
                defaults={
                    'email': f'supervisor{i+1}@treetracker.app',
                    'first_name': f'Supervisor',
                    'last_name': f'{i+1}',
                    'role': 'supervisor',
                    'zone': zone,
                }
            )
            sup.set_password('pass1234')
            sup.save()
            supervisors.append(sup)

        workers = []
        for i in range(5):
            zone = zones[i % len(zones)]
            worker, _ = User.objects.get_or_create(
                username=f'worker{i+1}',
                defaults={
                    'email': f'worker{i+1}@treetracker.app',
                    'first_name': f'Field Worker',
                    'last_name': f'{i+1}',
                    'role': 'field_worker',
                    'zone': zone,
                }
            )
            worker.set_password('pass1234')
            worker.save()
            workers.append(worker)

        self.stdout.write(f'  Created users: 1 admin, {len(supervisors)} supervisors, {len(workers)} field workers')

        # Create Trees
        health_weights = ['healthy'] * 6 + ['at_risk'] * 3 + ['dead'] * 1
        trees = []

        for zone in zones:
            lat_base = zone.center_lat
            lng_base = zone.center_lng
            num_trees = random.randint(30, 60)

            for _ in range(num_trees):
                tree = Tree(
                    species=random.choice(species_list),
                    zone=zone,
                    planted_by=random.choice(workers),
                    latitude=lat_base + random.uniform(-0.05, 0.05),
                    longitude=lng_base + random.uniform(-0.05, 0.05),
                    current_health=random.choice(health_weights),
                    planted_date=date.today() - timedelta(days=random.randint(30, 730)),
                    height_cm=random.randint(50, 500),
                    location_description=random.choice([
                        'Near main road', 'Park entrance', 'School boundary',
                        'Roadside median', 'Near water body', 'Colony compound'
                    ]),
                    notes=random.choice(['', '', 'Needs attention', 'Growing well', '']),
                )
                trees.append(tree)

        Tree.objects.bulk_create(trees)
        # Fetch back to get IDs for tag numbers
        for tree in Tree.objects.filter(tag_number__isnull=True):
            tree.tag_number = f"TRK-{tree.id:05d}"
        Tree.objects.bulk_update(Tree.objects.filter(tag_number__isnull=True), ['tag_number'])

        self.stdout.write(f'  Created {len(trees)} trees')

        # Create Maintenance Tasks
        task_types = ['water', 'prune', 'inspect', 'treat', 'fertilize']
        priorities = ['low', 'medium', 'high', 'urgent']
        statuses = ['pending', 'pending', 'pending', 'completed', 'in_progress']

        all_trees = list(Tree.objects.all())
        tasks = []
        for i in range(40):
            zone = random.choice(zones)
            task = MaintenanceTask(
                title=f"{random.choice(['Water trees in', 'Prune trees near', 'Inspect trees in', 'Treat diseased trees in'])} {zone.name}",
                task_type=random.choice(task_types),
                priority=random.choice(priorities),
                zone=zone,
                tree=random.choice(all_trees) if random.random() > 0.5 else None,
                created_by=random.choice(supervisors) if supervisors else admin_user,
                assigned_to=random.choice(workers),
                due_date=date.today() + timedelta(days=random.randint(-5, 14)),
                status=random.choice(statuses),
            )
            tasks.append(task)

        MaintenanceTask.objects.bulk_create(tasks)
        self.stdout.write(f'  Created {len(tasks)} maintenance tasks')

        self.stdout.write(self.style.SUCCESS('''
✅ Demo data seeded successfully!

Login credentials:
  Admin:      admin / admin123
  Supervisor: supervisor1 / pass1234
  Worker:     worker1 / pass1234

Visit: http://localhost:8000/api/docs/ for API documentation
        '''))
