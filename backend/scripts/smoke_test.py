"""Exercise the running API against its configured database.

Creates clearly labelled verification accounts; does not delete unrelated records.
Use database_admin.py cleanup-verification afterwards to remove only verification accounts.
"""
import base64
import json
import os
import urllib.error
import urllib.request
import uuid

BASE = os.environ.get('WELLNESS_API_URL', 'http://localhost:8080/api')
RUN = uuid.uuid4().hex[:10]
PNG = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=')

def call(method, path, body=None, token=None, expected=200, multipart=None):
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers['Content-Type'] = 'application/json'
    if multipart:
        boundary = 'wellness-' + uuid.uuid4().hex
        parts = []
        for name, value in multipart.items():
            parts.append(('--' + boundary + '\r\n').encode())
            if isinstance(value, bytes):
                parts.append((f'Content-Disposition: form-data; name="{name}"; filename="check.png"\r\nContent-Type: image/png\r\n\r\n').encode() + value + b'\r\n')
            else:
                parts.append((f'Content-Disposition: form-data; name="{name}"\r\nContent-Type: text/plain\r\n\r\n').encode() + json.dumps(value).encode() + b'\r\n')
        data = b''.join(parts) + ('--' + boundary + '--\r\n').encode()
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary
    try:
        response = urllib.request.urlopen(urllib.request.Request(BASE + path, data=data, headers=headers, method=method), timeout=60)
    except urllib.error.HTTPError as error:
        response = error
    result = response.read()
    if response.status != expected:
        raise AssertionError(f'{method} {path}: expected {expected}, got {response.status}: {result[:500]!r}')
    if not result:
        return None
    if 'image/' in response.headers.get('Content-Type', ''):
        return result
    return json.loads(result)

admin = call('POST', '/auth/login', {'email': 'admin@mr-care.app', 'password': 'password'})['token']
workspace = call('GET', '/admin/workspace', token=admin)
if workspace['summary']['totalMembers'] == 0:
    assert not workspace['attention'] and not workspace['approvals']
print('PASS: existing admin login and workspace; existing members preserved')

def register(label, photo=False):
    details = {'name': 'Integration Check ' + label, 'email': f'qa-{RUN}-{label}@example.invalid', 'password': 'Verification123!', 'age': 28, 'heightCm': 174, 'weightKg': 72.4}
    created = call('POST', '/auth/register', expected=201, multipart={'profile': details, 'image': PNG}) if photo else call('POST', '/auth/register', details, expected=201)
    assert created['status'] == 'PENDING' and created['token'] is None
    call('POST', '/auth/login', {'email': details['email'], 'password': details['password']}, expected=403)
    return created, details

member, details = register('member', photo=True)
workspace = call('GET', '/admin/workspace', token=admin)
assert any(r['id'] == member['id'] for r in workspace['approvals'])
call('PATCH', f"/admin/users/{member['id']}/approval", {'decision': 'APPROVE'}, admin, 204)
token = call('POST', '/auth/login', {'email': details['email'], 'password': details['password']})['token']
dashboard = call('GET', '/dashboard', token=token)
assert all(dashboard[k] == 0 for k in ['completion', 'calories', 'protein', 'waterGlasses', 'streak', 'activeMinutes'])
assert call('GET', '/plans/today', token=token) is None
assert call('GET', '/meals/today', token=token) == []
assert call('GET', '/activities', token=token) == []
assert call('GET', '/shared-members', token=token)['total'] == 0
assert call('GET', '/profile', token=token)['age'] == 28
assert call('GET', '/profile/photo', token=token) == PNG
assert call('GET', f"/admin/users/{member['id']}/profile-photo", token=admin) == PNG
print('PASS: pending registration, admin approval, zero starting totals, age and database photo')

plan = {'planName': 'Verification daily plan', 'items': [{'type': 'Breakfast', 'name': 'Verification oats', 'time': '08:00:00', 'calories': 400, 'protein': 20, 'ingredients': ['Oats', 'Milk']}]}
call('PUT', f"/admin/plans/members/{member['id']}", plan, admin)
meals = call('GET', '/meals/today', token=token)
assert len(meals) == 1 and meals[0]['name'] == 'Verification oats'
metadata = {'plannedMealId': meals[0]['id'], 'mealType': 'Breakfast', 'mealName': 'Oats and fruit', 'calories': 450, 'proteinGrams': 25, 'carbsGrams': 60, 'fatGrams': 12, 'clientRequestId': RUN}
post = call('POST', '/meal-posts', token=token, expected=201, multipart={'metadata': metadata, 'image': PNG})
retry = call('POST', '/meal-posts', token=token, expected=201, multipart={'metadata': metadata, 'image': PNG})
assert post['id'] == retry['id']
call('POST', '/water', {'amountMl': 250}, token, 201)
call('POST', '/activities', {'activity': 'Walk', 'durationSeconds': 125}, token, 201)
journal = call('GET', f"/admin/users/{member['id']}/journal", token=admin)
assert journal['today']['summary']['calories'] == 450
assert journal['today']['summary']['hydrationMl'] == 250
assert journal['today']['summary']['activityMinutes'] == 2
assert len(journal['today']['activities']) == 1
dashboard = call('GET', '/dashboard', token=token)
assert dashboard['calories'] == 450 and dashboard['protein'] == 25 and dashboard['completion'] == 100
assert dashboard['waterGlasses'] == 1 and dashboard['streak'] == 1
assert call('GET', f"/meal-posts/{post['id']}/image", token=admin) == PNG
print('PASS: diet plan, idempotent photo post, nutrition, hydration and timer visible to both accounts')
workspace = call('GET', '/admin/workspace', token=admin)
row = next(row for row in workspace['members'] if row['id'] == member['id'])
assert len(row['adherenceSeries']) == 7 and row['adherenceSeries'][-1]['value'] == 100 and row['adherence'] == 100
assert len(workspace['mealInsights']['ranges']['TODAY']['series']) == 8
assert len(workspace['mealInsights']['ranges']['7D']['series']) == 7
assert len(workspace['mealInsights']['ranges']['30D']['series']) == 30
print('PASS: live adherence and Today/7-day/30-day chart series')

viewer, viewer_details = register('viewer')
call('PATCH', f"/admin/users/{viewer['id']}/approval", {'decision': 'APPROVE'}, admin, 204)
viewer_token = call('POST', '/auth/login', {'email': viewer_details['email'], 'password': viewer_details['password']})['token']
call('GET', f"/meal-posts/{post['id']}/image", token=viewer_token, expected=404)
call('PUT', f"/admin/member-access/{viewer['id']}", {'memberIds': [member['id']]}, admin)
assert call('GET', '/shared-members', token=viewer_token)['total'] == 1
assert call('GET', f"/shared-members/{member['id']}/today", token=viewer_token)['summary']['calories'] == 450
assert call('GET', f"/meal-posts/{post['id']}/image", token=viewer_token) == PNG
call('PUT', f"/admin/member-access/{viewer['id']}", {'memberIds': []}, admin)
call('GET', f"/shared-members/{member['id']}/today", token=viewer_token, expected=404)
call('GET', f"/meal-posts/{post['id']}/image", token=viewer_token, expected=404)
declined, declined_details = register('declined')
call('PATCH', f"/admin/users/{declined['id']}/approval", {'decision': 'DECLINE'}, admin, 204)
call('POST', '/auth/login', {'email': declined_details['email'], 'password': declined_details['password']}, expected=403)
print('PASS: shared access grant/revoke, protected images, declined registration blocked')
print('Verification account IDs:', member['id'], viewer['id'], declined['id'])
