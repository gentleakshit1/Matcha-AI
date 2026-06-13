from django.core.management.base import BaseCommand
import csv
import os
from core.models import JobDescription

class Command(BaseCommand):
    help = 'Loads Job Descriptions from a Kaggle CSV dataset.'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')
        parser.add_argument('--limit', type=int, default=0, help='Limit number of rows to load')

    def handle(self, *args, **kwargs):
        csv_path = kwargs['csv_file']
        limit = kwargs['limit']

        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f"File {csv_path} does not exist."))
            return

        with open(csv_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            columns = [c.lower().strip() for c in reader.fieldnames]
            
            # Auto-detect column names
            title_col = next((c for c in reader.fieldnames if 'title' in c.lower()), None)
            desc_col = next((c for c in reader.fieldnames if 'description' in c.lower() or 'text' in c.lower()), None)

            if not title_col or not desc_col:
                self.stdout.write(self.style.ERROR(f"Could not autodetect columns. Found: {reader.fieldnames}"))
                return
            
            self.stdout.write(self.style.SUCCESS(f"Detected mapping: Title -> '{title_col}', Description -> '{desc_col}'"))

            created_count = 0
            batch_size = 2000
            objs = []
            for row in reader:
                title = row.get(title_col, '').strip()
                description = row.get(desc_col, '').strip()

                if title and description:
                    objs.append(JobDescription(
                        title=title[:255],
                        raw_text=description
                    ))
                    created_count += 1
                
                    if len(objs) >= batch_size:
                        JobDescription.objects.bulk_create(objs, ignore_conflicts=True)
                        self.stdout.write(f"Loaded {created_count} records so far...")
                        objs = []

                if limit and created_count >= limit:
                    break
            
            if objs:
                JobDescription.objects.bulk_create(objs, ignore_conflicts=True)

        self.stdout.write(self.style.SUCCESS(f"Successfully loaded {created_count} Job Descriptions into the database!"))
