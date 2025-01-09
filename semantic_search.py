import os
import sys
import argparse
import numpy as np
import pickle
#import openai
import torch
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

#client = OpenAI(
#    api_key=os.environ.get("OPENAI_API_KEY"),  # This is the default and can be omitted
#)

#chat_completion = client.chat.completions.create(
#    messages=[
#        {
#            "role": "user",
#            "content": "Say this is a test",
#        }
#    ],
#    model="gpt-4o",
#)

# -------------
# Configuration
# -------------
EMB_PATH = "C:/Users/rishi/OneDrive/Desktop/embeddings/paper_embeddings.npy"
META_PATH = "C:/Users/rishi/OneDrive/Desktop/embeddings/paper_metadata.pkl"

# Change this if you want a different local model
LOCAL_MODEL_NAME = "sentence-transformers/all-mpnet-base-v2"

# Change this if you want a different OpenAI model
OPENAI_EMBEDDING_MODEL = "text-embedding-ada-002"

# -------------
# Helper Functions
# -------------
def load_embeddings_and_metadata():
    """
    Load locally stored embeddings and metadata (paper IDs, text, etc.).
    """
    if not os.path.exists(EMB_PATH) or not os.path.exists(META_PATH):
        raise FileNotFoundError("Embeddings or metadata file not found. "
                                "Make sure you have run create_embeddings.py or have them in place.")

    doc_embs = np.load(EMB_PATH)  # shape: (num_docs, emb_dim)
    with open(META_PATH, "rb") as f:
        paper_metadata = pickle.load(f)
    return doc_embs, paper_metadata

def embed_query_local(query, model):
    """
    Embed the query text using a local SentenceTransformer model.
    """
    # Return shape: (1, emb_dim)
    emb = model.encode([query])
    return np.array(emb)

def embed_query_openai(query, model_name=OPENAI_EMBEDDING_MODEL):
    """
    Embed the query text using the OpenAI API (text-embedding-ada-002, etc.).
    Requires openai.api_key to be set.
    """
    response = openai.Embedding.create(model=model_name, input=query)
    # Extract the vector from the response
    vector = response["data"][0]["embedding"]  # list of floats
    return np.array([vector])  # shape: (1, emb_dim)

def get_top_k(query_emb, doc_embs, k=5):
    """
    Compute the cosine similarity between the query embedding and all doc embeddings,
    then return the indices + similarity scores of the top-k documents.
    """
    sims = cosine_similarity(query_emb, doc_embs)[0]  # shape: (num_docs,)
    top_k_indices = np.argsort(sims)[::-1][:k]        # descending sort
    top_k_scores = sims[top_k_indices]
    return top_k_indices, top_k_scores

# -------------
# Main
# -------------
def main():
    parser = argparse.ArgumentParser(description="Semantic search for academic papers.")
    parser.add_argument("query", type=str, help="Your search query.")
    parser.add_argument("--use_openai", action="store_true",
                        help="Use OpenAI embeddings instead of local model.")
    parser.add_argument("--openai_api_key", type=str, default=None,
                        help="OpenAI API key (optional, can also be set as env var).")
    parser.add_argument("--k", type=int, default=5,
                        help="Number of top results to retrieve.")
    args = parser.parse_args()

    # 1. Load doc embeddings + metadata
    doc_embs, paper_metadata = load_embeddings_and_metadata()
    print(f"[INFO] Loaded {doc_embs.shape[0]} document embeddings.")

    # 2. Prepare query embedding
    if args.use_openai:
        # Optionally set the API key
        if args.openai_api_key:
            openai.api_key = args.openai_api_key
        elif os.environ.get("OPENAI_API_KEY"):
            openai.api_key = os.environ["OPENAI_API_KEY"]
        else:
            print("ERROR: No OpenAI API key provided. Use --openai_api_key or set OPENAI_API_KEY env var.")
            sys.exit(1)

        print("[INFO] Embedding query with OpenAI model:", OPENAI_EMBEDDING_MODEL)
        query_emb = embed_query_openai(args.query)

    else:
        # Use local model
        print("[INFO] Embedding query with local model:", LOCAL_MODEL_NAME)

        # Make sure device is set to GPU if available
        device = "cuda" if torch.cuda.is_available() else "cpu"
        local_model = SentenceTransformer(LOCAL_MODEL_NAME, device=device)

        query_emb = embed_query_local(args.query, local_model)

    # 3. Compute top-K
    top_k_indices, top_k_scores = get_top_k(query_emb, doc_embs, k=args.k)

    # 4. Display results
    # paper_metadata structure could vary; we assume keys like "paper_ids" and "texts".
    print(f"\n[INFO] Top {args.k} relevant papers for query='{args.query}':\n")
    for rank, (idx, score) in enumerate(zip(top_k_indices, top_k_scores), 1):
        paper_id = paper_metadata["paper_ids"][idx]
        # If you have a 'titles' or 'texts' key, adjust accordingly
        paper_text = paper_metadata.get("texts", [""])[idx]

        # Truncate the text for display
        snippet = paper_text[:200].replace("\n", " ") + "..."
        print(f"Rank {rank}: (Paper ID: {paper_id})  Score: {score:.4f}")
        print(f"Snippet: {snippet}")
        print("-" * 60)

if __name__ == "__main__":
    main()
