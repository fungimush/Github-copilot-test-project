from copy import deepcopy
from fastapi.testclient import TestClient
import pytest

from src import app as app_module
from src.app import app, activities

from copy import deepcopy
from fastapi.testclient import TestClient
import pytest

from src.app import app, activities

client = TestClient(app)


@pytest.fixture(autouse=True)
def restore_activities():
    """Snapshot activities before each test and restore after to keep tests isolated."""
    orig = deepcopy(activities)
    yield
    activities.clear()
    activities.update(deepcopy(orig))


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # should contain at least one known activity
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity_name = "Chess Club"
    test_email = "test.student@mergington.edu"

    # Ensure test_email not in participants
    assert test_email not in activities[activity_name]["participants"]

    # Signup
    resp = client.post(f"/activities/{activity_name}/signup?email={test_email}")
    assert resp.status_code == 200
    body = resp.json()
    assert "Signed up" in body.get("message", "")
    assert test_email in activities[activity_name]["participants"]

    # Duplicate signup should fail
    resp2 = client.post(f"/activities/{activity_name}/signup?email={test_email}")
    assert resp2.status_code == 400

    # Unregister
    resp3 = client.delete(f"/activities/{activity_name}/unregister?email={test_email}")
    assert resp3.status_code == 200
    assert test_email not in activities[activity_name]["participants"]

    # Unregister again should fail
    resp4 = client.delete(f"/activities/{activity_name}/unregister?email={test_email}")
    assert resp4.status_code == 400


def test_signup_nonexistent_activity():
    resp = client.post("/activities/NoSuchActivity/signup?email=a@b.com")
    assert resp.status_code == 404


def test_unregister_nonexistent_activity():
    resp = client.delete("/activities/NoSuchActivity/unregister?email=a@b.com")
    assert resp.status_code == 404