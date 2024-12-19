import pandas as pd
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.preprocessing import normalize
from tqdm import tqdm
import re

# Function to parse the raw text file efficiently
def parse_rawtext_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as file:
        data = file.read()

    entries = re.split(r"##", data)[1:]  # Skip the first empty split
    records = [{"id": entry.split("\n", 1)[0].strip(), 
                "abstract": entry.split("\n", 1)[1].strip()} for entry in entries if "\n" in entry]

    return pd.DataFrame(records)

# Function to generate embeddings in batches
def generate_embeddings(df, model, batch_size=64):
    embeddings = []
    for i in tqdm(range(0, len(df), batch_size)):
        batch = df['abstract'].iloc[i:i + batch_size].tolist()
        batch_embeddings = model.encode(batch, batch_size=batch_size, show_progress_bar=False)
        embeddings.extend(batch_embeddings)
    return embeddings

# Function for semantic search
def semantic_search(query, model, normalized_embeddings, df, top_k=5):
    query_embedding = normalize(model.encode(query).reshape(1, -1))
    similarities = np.dot(normalized_embeddings, query_embedding.T).flatten()
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    return df.iloc[top_indices]

# Main program
if __name__ == "__main__":
    # File path to the raw text file
    file_path = "C:\\Users\\rishi\\OneDrive\\Desktop\\citeulike-t-master\\citeulike-t-master\\rawtext - Copy.dat"
    
    # Parse the raw text file
    print("Parsing raw text file...")
    df = parse_rawtext_file(file_path)
    print("DataFrame created with shape:", df.shape)
    print(df.head())

    # Load the Sentence Transformer model
    print("Loading sentence transformer model...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    # Generate embeddings and save them
    print("Generating embeddings...")
    df['embedding'] = generate_embeddings(df, model)
    all_embeddings = np.vstack(df['embedding'].values)

    # Normalize embeddings for efficient similarity computation
    print("Normalizing embeddings...")
    normalized_embeddings = normalize(all_embeddings)

    # Semantic search query
    query = "How can a non-slip boundary condition be effectively implemented in lattice Boltzmann simulations?"
    print(f"Performing semantic search for query: {query}")
    results = semantic_search(query, model, normalized_embeddings, df, top_k=5)

    # Display results
    for _, row in results.iterrows():
        print(f"ID: {row['id']}\nAbstract: {row['abstract']}\n")
