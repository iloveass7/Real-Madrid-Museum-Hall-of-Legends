"""Detect the largest face with OpenCV Haar cascades and save a clean,
 generously-framed crop for the statue head texture.

Usage: python tools/face_crop.py [source1.jpg source2.jpg ...]
"""
import sys
import cv2
import numpy as np

CANDIDATES = sys.argv[1:] or ["assets/img/cr7.jpg", "assets/img/cr7_portrait.jpg"]
DST = "assets/img/cr7_face.jpg"

cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_eye.xml")


def try_face(path):
    img = cv2.imread(path)
    if img is None:
        return None
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.equalizeHist(gray)
    faces = cascade.detectMultiScale(gray, 1.08, 5, minSize=(int(w * 0.06), int(w * 0.06)))
    if len(faces) == 0:
        return None
    # largest face
    x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
    # confidence: eyes detected inside the face box?
    roi = cv2.cvtColor(img[y:y + fh, x:x + fw], cv2.COLOR_BGR2GRAY)
    eyes = eye_cascade.detectMultiScale(roi, 1.1, 4)
    # crop frame: hair above, chin/neck below
    top = max(0, int(y - fh * 0.65))
    bot = min(h, int(y + fh * 1.35))
    left = max(0, int(x - fw * 0.30))
    right = min(w, int(x + fw * 1.30))
    crop = img[top:bot, left:right]
    ch, cw = crop.shape[:2]
    # pad to 1:1.12 portrait
    target_h = int(cw * 1.12)
    if ch < target_h:
        canvas = np.full((target_h, cw, 3), (28, 22, 18), np.uint8)
        canvas[:ch] = crop
        crop = canvas
    elif ch > target_h:
        crop = crop[:target_h]
    crop = cv2.resize(crop, (512, 576), interpolation=cv2.INTER_LANCZOS4)
    cv2.imwrite(DST, crop, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return {
        "face": (int(x), int(y), int(fw), int(fh)),
        "frame": (int(left), int(top), int(right), int(bot)),
        "eyes": len(eyes),
        "img": f"{w}x{h}",
    }


for path in CANDIDATES:
    r = try_face(path)
    if r:
        print(f"{path}: image {r['img']}, face box x={r['face'][0]} y={r['face'][1]} "
              f"w={r['face'][2]} h={r['face'][3]}, eyes={r['eyes']} -> saved {DST}")
    else:
        print(f"{path}: no frontal face found")
