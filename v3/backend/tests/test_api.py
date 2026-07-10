def test_health_check(client):
    resp = client.get("/api/v3/config/check")
    assert resp.status_code == 200


def test_genres_list(client):
    resp = client.get("/api/v3/genres/list?gender=男频")
    assert resp.status_code == 200
    data = resp.json()
    assert "genres" in data
    assert len(data["genres"]) > 0


def test_models_list(client):
    resp = client.get("/api/v3/models/list")
    assert resp.status_code == 200
    data = resp.json()
    assert "models" in data
    assert len(data["models"]) > 0
    assert "provider" in data["models"][0]


def test_voices_endpoint(client):
    resp = client.get("/api/v3/tts/voices")
    assert resp.status_code == 200
    data = resp.json()
    assert "voices" in data or isinstance(data, list)


def test_empty_novel_list(client):
    resp = client.get("/api/v3/novels/0")
    assert resp.status_code == 404
