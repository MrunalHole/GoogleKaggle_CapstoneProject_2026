import os
import glob
import pandas as pd
import numpy as np
import librosa
import warnings

# Suppress excessive librosa warnings
warnings.filterwarnings('ignore', category=UserWarning)

def extract_acoustic_features(file_path):
    """
    Extracts baseline vocal acoustic features from a .wav file.
    Provides a mathematical approximation of Praat's biological Jitter/Shimmer parameters using librosa.
    """
    try:
        y, sr = librosa.load(file_path, sr=None)
        
        # 1. Fundamental Frequency (F0, Fhi, Flo)
        # Using librosa.yin for more robust F0 tracking in speech
        f0 = librosa.yin(y, fmin=50, fmax=400, sr=sr)
        f0 = f0[f0 > 0] # Filter out unvoiced silent frames
        
        if len(f0) == 0:
            return None
            
        f0_mean = np.mean(f0)
        f0_hi = np.max(f0)
        f0_lo = np.min(f0)
        
        # 2. Vocal Stability: Calculate Jitter (period-to-period duration variation)
        periods = 1.0 / f0
        period_diffs = np.abs(np.diff(periods))
        jitter_percent = (np.mean(period_diffs) / np.mean(periods)) * 100
        
        # 3. Vocal Stability: Calculate Shimmer (amplitude variation)
        # Extract RMS energy (amplitude)
        rms = librosa.feature.rms(y=y)[0]
        rms_diffs = np.abs(np.diff(rms))
        shimmer_percent = (np.mean(rms_diffs) / np.mean(rms)) * 100 if np.mean(rms) > 0 else 0
        
        # 4. Signal-to-Noise: Calculate HNR (Harmonic-to-Noise Ratio)
        # Using harmonic/percussive source separation to isolate tonal vocals from noise/breathiness
        y_harmonic, y_percussive = librosa.effects.hpss(y)
        h_power = np.mean(y_harmonic**2)
        p_power = np.mean(y_percussive**2)
        hnr = 10 * np.log10(h_power / p_power) if p_power > 0 else 0
        
        return {
            'MDVP:Fo(Hz)': f0_mean,
            'MDVP:Fhi(Hz)': f0_hi,
            'MDVP:Flo(Hz)': f0_lo,
            'MDVP:Jitter(%)': jitter_percent,
            'MDVP:Shimmer': shimmer_percent,
            'HNR': hnr
        }
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return None

def parse_patient_metadata(file_path):
    """
    Resolves patient identifier and clinical status based on directory structure and filename.
    Customize the parsing split logic based on your exact dataset layout.
    """
    filename = os.path.basename(file_path)
    
    # Filenames are like 'AH_528T_6A746E...wav'. The patient ID is the first two parts (e.g., AH_528T).
    parts = filename.split('.')[0].split('_')
    patient_id = "_".join(parts[:2]) if len(parts) >= 2 else parts[0]
    
    # Determine status by searching path and filename for clinical keywords
    path_str = str(file_path).lower()
    if 'healthy' in path_str or 'control' in path_str or 'hc' in path_str or 'cont' in filename.lower():
        status = 0
    elif 'parkinson' in path_str or 'pd' in path_str or 'pt' in filename.lower():
        status = 1
    else:
        status = -1 # Flag for manual inspection
        
    return patient_id, status

def main():
    base_dir = './data/audio' 
    output_train_csv = './data/extracted_audio_train.csv'
    output_test_csv = './data/extracted_audio_test.csv'
    
    print("Initializing Audio Pipeline...\nSearching for .wav files...")
    wav_files = glob.glob(f'{base_dir}/**/*.wav', recursive=True)
    
    if not wav_files:
        print(f"No .wav files found in {base_dir}")
        return
        
    print(f"Found {len(wav_files)} audio recordings. Commencing feature extraction...")
    
    extracted_data = []
    
    for i, file_path in enumerate(wav_files):
        print(f"[{i+1}/{len(wav_files)}] Processing {file_path}...")
        
        patient_id, status = parse_patient_metadata(file_path)
        
        features = extract_acoustic_features(file_path)
        if features is None:
            continue
            
        row = {
            'patient_id': patient_id,
            'status': status,
        }
        row.update(features)
        extracted_data.append(row)
        
    if not extracted_data:
        print("No valid vocal features could be extracted.")
        return
        
    df = pd.DataFrame(extracted_data)
    
    # Ensure standard schema layout matching our Schema Harmonization Layer
    from sklearn.model_selection import GroupShuffleSplit
    
    groups = df['patient_id']
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(df, groups=groups))
    
    df_train = df.iloc[train_idx]
    df_test = df.iloc[test_idx]
    
    # Save to CSVs for direct tabular ML ingestion
    os.makedirs(os.path.dirname(output_train_csv), exist_ok=True)
    df_train.to_csv(output_train_csv, index=False)
    df_test.to_csv(output_test_csv, index=False)
    
    print(f"\nExtraction complete!")
    print(f"Exported Train Set: {len(df_train)} records to {output_train_csv}")
    print(f"Exported Test Set: {len(df_test)} records to {output_test_csv}")

if __name__ == '__main__':
    main()
