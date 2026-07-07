from app.services.contradiction_engine import detect_contradictions

def test_detect_contradictions_no_conflicts():
    chars = [
        {
            "id": "char_001",
            "name": "Elena Voss",
            "status_by_chapter": {"chapter_01": "alive", "chapter_02": "alive"}
        }
    ]
    chapters = [
        {"chapter_id": "chapter_01", "title": "Ch 1", "world_state": {}},
        {"chapter_id": "chapter_02", "title": "Ch 2", "world_state": {}}
    ]
    flags = detect_contradictions(chars, chapters)
    assert len(flags) == 0

def test_detect_contradictions_character_death_alive():
    chars = [
        {
            "id": "char_001",
            "name": "Elena Voss",
            "status_by_chapter": {"chapter_01": "alive", "chapter_02": "deceased", "chapter_03": "alive"}
        }
    ]
    chapters = [
        {"chapter_id": "chapter_01", "title": "Ch 1", "world_state": {}},
        {"chapter_id": "chapter_02", "title": "Ch 2", "world_state": {}},
        {"chapter_id": "chapter_03", "title": "Ch 3", "world_state": {}}
    ]
    flags = detect_contradictions(chars, chapters)
    assert len(flags) == 1
    assert flags[0]["type"] == "state_conflict"
    assert flags[0]["entity"] == "Elena Voss"
    assert "deceased" in flags[0]["description"]
    assert "alive" in flags[0]["description"]

def test_detect_contradictions_location_destruction():
    chars = []
    chapters = [
        {
            "chapter_id": "chapter_01",
            "title": "Ch 1",
            "world_state": {"faction_control": {"Varen": "active"}}
        },
        {
            "chapter_id": "chapter_02",
            "title": "Ch 2",
            "world_state": {"faction_control": {"Varen": "destroyed"}}
        },
        {
            "chapter_id": "chapter_03",
            "title": "Ch 3",
            "world_state": {"faction_control": {"Varen": "active"}}
        }
    ]
    flags = detect_contradictions(chars, chapters)
    assert len(flags) == 1
    assert flags[0]["type"] == "state_conflict"
    assert flags[0]["entity"] == "Varen"
    assert "destroyed" in flags[0]["description"]
    assert "active" in flags[0]["description"]
