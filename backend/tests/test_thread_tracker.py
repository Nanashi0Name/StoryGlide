from app.services.thread_tracker import track_threads

def test_track_threads_unresolved():
    threads = [
        {
            "introduced_chapter": "chapter_01",
            "description": "Elena Voss is given a locked chest.",
            "type": "chekhov_gun"
        }
    ]
    chapters = [
        {"chapter_id": "chapter_01", "title": "Ch 1", "text": "She held the locked chest."},
        {"chapter_id": "chapter_02", "title": "Ch 2", "text": "They walked into town."}
    ]
    tracked = track_threads(threads, chapters)
    assert len(tracked) == 1
    assert tracked[0]["resolved"] is False

def test_track_threads_resolved():
    threads = [
        {
            "introduced_chapter": "chapter_01",
            "description": "Elena Voss is given a locked chest.",
            "type": "chekhov_gun"
        }
    ]
    chapters = [
        {"chapter_id": "chapter_01", "title": "Ch 1", "text": "She held the locked chest."},
        {"chapter_id": "chapter_02", "title": "Ch 2", "text": "She finally unlocked the chest and found a letter."}
    ]
    tracked = track_threads(threads, chapters)
    assert len(tracked) == 1
    assert tracked[0]["resolved"] is True
