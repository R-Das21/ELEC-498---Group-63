import os
import numpy as np
import pandas as pd
import pickle
from sentence_transformers import SentenceTransformer

DATA_CSV = "C:/Users/rishi/OneDrive/Desktop/citeulike-t-master/citeulike-t-master/papers.csv"
SAVE_EMB_PATH = "C:/Users/rishi/OneDrive/Desktop/embeddings/paper_embeddings.npy"
SAVE_META_PATH = "C:/Users/rishi/OneDrive/Desktop/embeddings/paper_metadata.pkl"

def main():
    # 1. Load the CSV that parse_raw_data.py created
    if not os.path.exists(DATA_CSV):
        raise FileNotFoundError(f"CSV file not found: {DATA_CSV}. Run parse_raw_data.py first.")

    df = pd.read_csv(DATA_CSV)  # columns: paper_id, text
    print(f"[INFO] Loaded {len(df)} papers from {DATA_CSV}")

    # 2. Initialize the embedding model
    model_name = "sentence-transformers/all-mpnet-base-v2"
    embedder = SentenceTransformer(model_name)

    # 3. Convert the 'text' column into embeddings
    # Depending on your preference, you could also store partial text or parse out a title line, etc.
    texts_to_embed = df["text"].tolist()

    print("[INFO] Generating embeddings...")
    embeddings = embedder.encode(texts_to_embed, batch_size=32, show_progress_bar=True)
    embeddings = np.array(embeddings)

    # 4. Save embeddings
    os.makedirs("embeddings", exist_ok=True)
    np.save(SAVE_EMB_PATH, embeddings)

    # 5. Save metadata
    paper_metadata = {
        "paper_ids": df["paper_id"].tolist(),
        "texts": df["text"].tolist(),
    }
    with open(SAVE_META_PATH, "wb") as f:
        pickle.dump(paper_metadata, f)

    print(f"[INFO] Embeddings saved to {SAVE_EMB_PATH}")
    print(f"[INFO] Metadata saved to {SAVE_META_PATH}")

if __name__ == "__main__":
    main()
