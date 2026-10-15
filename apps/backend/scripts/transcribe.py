"""Transcribes one audio file with faster-whisper and prints JSON to stdout.

Usage: transcribe.py <audio-file> [--model NAME] [--device cuda|cpu] [--language es]
                     [--ffmpeg PATH]
Output: {"text": "...", "language": "es", "duration": 42.1}

Run with the Python of a virtualenv that has faster-whisper installed (see
TRANSCRIPTION_* in apps/backend/.env.example).
"""

import argparse
import ctypes
import glob
import json
import os
import site
import subprocess
import sys

SAMPLE_RATE = 16000


def preload_pip_cuda_libraries() -> None:
    # cuBLAS/cuDNN installed as pip wheels are not on the loader's search path,
    # and LD_LIBRARY_PATH cannot be changed once the process has started, so
    # load them by absolute path before ctranslate2 asks for them.
    for base in site.getsitepackages():
        for pattern in ("nvidia/cublas/lib/libcublas*.so*", "nvidia/cudnn/lib/libcudnn*.so*"):
            for path in sorted(glob.glob(os.path.join(base, pattern))):
                try:
                    ctypes.CDLL(path, mode=ctypes.RTLD_GLOBAL)
                except OSError:
                    pass


def decode_audio(path: str, ffmpeg: str):
    # Decoded with the ffmpeg binary rather than PyAV: the bundled PyAV breaks
    # between faster-whisper releases, and ffmpeg is already a server dependency.
    import numpy as np

    raw = subprocess.run(
        [ffmpeg, "-nostdin", "-v", "error", "-i", path,
         "-f", "s16le", "-ac", "1", "-ar", str(SAMPLE_RATE), "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio")
    parser.add_argument("--model", default="large-v3-turbo")
    parser.add_argument("--device", default="cuda")
    parser.add_argument("--language", default="es")
    parser.add_argument("--ffmpeg", default="ffmpeg")
    args = parser.parse_args()

    if args.device == "cuda":
        preload_pip_cuda_libraries()

    from faster_whisper import WhisperModel

    compute_type = "float16" if args.device == "cuda" else "int8"
    model = WhisperModel(args.model, device=args.device, compute_type=compute_type)
    segments, info = model.transcribe(
        decode_audio(args.audio, args.ffmpeg),
        language=args.language,
        vad_filter=True,
        beam_size=5,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    json.dump(
        {"text": text, "language": info.language, "duration": info.duration},
        sys.stdout,
        ensure_ascii=False,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
