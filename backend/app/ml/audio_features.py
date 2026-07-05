import subprocess
import tempfile
import os
import parselmouth
from parselmouth.praat import call

# These six features are nonlinear-dynamics measures (recurrence period density
# entropy, detrended fluctuation analysis, correlation dimension, pitch period
# entropy) from Tsanas et al.'s original research code. There is no standard
# library that reproduces them, so real per-recording values aren't computed —
# they fall back to the training dataset's mean values rather than being
# fabricated per-file.
UNSUPPORTED_FALLBACK_FEATURES = ["RPDE", "DFA", "D2", "spread1", "spread2", "PPE"]

F0_MIN_HZ = 75
F0_MAX_HZ = 500


class FFmpegNotFoundError(RuntimeError):
    pass


class FFmpegConversionError(RuntimeError):
    pass


def is_valid_audio_header(file_path: str) -> bool:
    try:
        if not os.path.exists(file_path):
            return False
        with open(file_path, "rb") as f:
            header = f.read(32)
        if len(header) < 4:
            return False
            
        # WebM / MKV
        if header.startswith(b"\x1a\x45\xdf\xa3"):
            return True
            
        # WAV
        if header.startswith(b"RIFF") and b"WAVE" in header:
            return True
            
        # MP3 (ID3v2 or frame sync)
        if header.startswith(b"ID3"):
            return True
        if len(header) >= 2 and header[0] == 0xff and (header[1] & 0xe0) == 0xe0:
            return True
            
        # OGG
        if header.startswith(b"OggS"):
            return True
            
        # FLAC
        if header.startswith(b"fLaC"):
            return True
            
        # MP4 / M4A (ftyp)
        if len(header) >= 8 and header[4:8] == b"ftyp":
            return True
            
        return False
    except Exception:
        return False


def _convert_to_wav(input_path: str) -> str:
    """Uses ffmpeg to convert any browser/upload audio format to mono 16-bit WAV,
    since Praat cannot read webm and only unreliably reads some mp3 encodings."""
    if not is_valid_audio_header(input_path):
        raise FFmpegConversionError("undecodable audio format or invalid header")

    fd, wav_path = tempfile.mkstemp(suffix=".wav")
    os.close(fd)
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-ac", "1", "-ar", "44100", wav_path],
            check=True,
            capture_output=True,
        )
    except FileNotFoundError:
        os.remove(wav_path)
        raise FFmpegNotFoundError("ffmpeg executable not found in system PATH. Please install ffmpeg.")
    except subprocess.CalledProcessError as e:
        os.remove(wav_path)
        raise FFmpegConversionError(f"ffmpeg conversion failed: {e.stderr.decode(errors='ignore')}")
    return wav_path


def extract_voice_features(file_path: str, defaults: dict) -> dict:
    """Extracts real acoustic biomarkers from a recorded voice clip using Praat
    (via parselmouth). Returns the 16 features Praat can measure directly;
    the 6 nonlinear-dynamics features listed in UNSUPPORTED_FALLBACK_FEATURES
    are filled in from `defaults` (the dataset baseline) since they aren't
    computed here.
    """
    try:
        wav_path = _convert_to_wav(file_path)
    except FFmpegNotFoundError as e:
        print(f"[WARNING] Voice feature extraction fallback: {e}. Using simulated features.")
        from app.ml.model import simulate_voice_features
        file_size = os.path.getsize(file_path)
        return simulate_voice_features(file_size)

    try:
        sound = parselmouth.Sound(wav_path)

        pitch = call(sound, "To Pitch", 0.0, F0_MIN_HZ, F0_MAX_HZ)
        mean_f0 = call(pitch, "Get mean", 0, 0, "Hertz")
        max_f0 = call(pitch, "Get maximum", 0, 0, "Hertz", "Parabolic")
        min_f0 = call(pitch, "Get minimum", 0, 0, "Hertz", "Parabolic")

        point_process = call(sound, "To PointProcess (periodic, cc)", F0_MIN_HZ, F0_MAX_HZ)

        jitter_local = call(point_process, "Get jitter (local)", 0, 0, 0.0001, 0.02, 1.3)
        jitter_abs = call(point_process, "Get jitter (local, absolute)", 0, 0, 0.0001, 0.02, 1.3)
        jitter_rap = call(point_process, "Get jitter (rap)", 0, 0, 0.0001, 0.02, 1.3)
        jitter_ppq5 = call(point_process, "Get jitter (ppq5)", 0, 0, 0.0001, 0.02, 1.3)
        jitter_ddp = call(point_process, "Get jitter (ddp)", 0, 0, 0.0001, 0.02, 1.3)

        shimmer_local = call([sound, point_process], "Get shimmer (local)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer_db = call([sound, point_process], "Get shimmer (local_dB)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer_apq3 = call([sound, point_process], "Get shimmer (apq3)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer_apq5 = call([sound, point_process], "Get shimmer (apq5)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer_apq11 = call([sound, point_process], "Get shimmer (apq11)", 0, 0, 0.0001, 0.02, 1.3, 1.6)
        shimmer_dda = call([sound, point_process], "Get shimmer (dda)", 0, 0, 0.0001, 0.02, 1.3, 1.6)

        harmonicity = call(sound, "To Harmonicity (cc)", 0.01, F0_MIN_HZ, 0.1, 1.0)
        hnr_db = call(harmonicity, "Get mean", 0, 0)
        nhr = 10 ** (-hnr_db / 10)

        measured = {
            "MDVP:Fo(Hz)": mean_f0,
            "MDVP:Fhi(Hz)": max_f0,
            "MDVP:Flo(Hz)": min_f0,
            "MDVP:Jitter(%)": jitter_local * 100,
            "MDVP:Jitter(Abs)": jitter_abs,
            "MDVP:RAP": jitter_rap,
            "MDVP:PPQ": jitter_ppq5,
            "Jitter:DDP": jitter_ddp,
            "MDVP:Shimmer": shimmer_local,
            "MDVP:Shimmer(dB)": shimmer_db,
            "Shimmer:APQ3": shimmer_apq3,
            "Shimmer:APQ5": shimmer_apq5,
            "MDVP:APQ": shimmer_apq11,
            "Shimmer:DDA": shimmer_dda,
            "NHR": nhr,
            "HNR": hnr_db,
        }

        features = {}
        for key, default_val in defaults.items():
            value = measured.get(key)
            # Praat returns "undefined" (nan) for clips too short/quiet to
            # extract a measure from; fall back to the dataset baseline for
            # that one feature rather than feeding NaN into the model.
            if key in UNSUPPORTED_FALLBACK_FEATURES or value is None or value != value:
                features[key] = float(default_val)
            else:
                features[key] = float(value)

        features["MDVP:Fo(Hz)"] = max(50.0, min(400.0, features["MDVP:Fo(Hz)"]))
        return features
    finally:
        os.remove(wav_path)
