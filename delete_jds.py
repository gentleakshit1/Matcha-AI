from core.models import JobDescription

def run():
    print(f"Total initial: {JobDescription.objects.count()}")
    ids_to_keep = list(JobDescription.objects.order_by('id').values_list('id', flat=True)[:50])
    
    # We also must keep the 'Attending Physician' JD so the user's applications don't get cascade deleted and crash the portal
    physician_jd = JobDescription.objects.filter(title__icontains='Physician').first()
    if physician_jd and physician_jd.id not in ids_to_keep:
        ids_to_keep.append(physician_jd.id)
        
    qs = JobDescription.objects.exclude(id__in=ids_to_keep)
    
    count = qs.count()
    print(f"To delete: {count}")
    
    while count > 0:
        print(f"Remaining: {count}")
        # Delete in chunks to avoid SQLite disk I/O error
        chunk_ids = list(qs.values_list('id', flat=True)[:2000])
        JobDescription.objects.filter(id__in=chunk_ids).delete()
        count = qs.count()
        
    print(f"Done. Final count: {JobDescription.objects.count()}")

run()
