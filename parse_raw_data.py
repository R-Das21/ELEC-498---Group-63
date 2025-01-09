import os
import pandas as pd

RAW_DATA_FILE = "C:/Users/rishi/OneDrive/Desktop/citeulike-t-master/citeulike-t-master/rawtext.dat"
OUTPUT_CSV = "C:/Users/rishi/OneDrive/Desktop/citeulike-t-master/citeulike-t-master/papers.csv"

def parse_raw_text(filepath):
    """
    Parse the raw data file where paper abstracts are separated by lines like '##0', '##1', etc.
    Returns a list of dicts, each with {'paper_id': str, 'text': str}.
    """
    papers = []
    current_id = None
    current_text_lines = []

    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()

            # Detect a new paper ID line (e.g., "##0", "##1", etc.)
            if line.startswith('##'):
                # If we already have an active paper, save it before starting a new one
                if current_id is not None:
                    papers.append({
                        'paper_id': current_id,
                        'text': "\n".join(current_text_lines)
                    })

                # Extract numeric ID after "##"
                current_id = line.replace('##', '').strip()
                current_text_lines = []
            else:
                # Accumulate text lines for the current paper
                current_text_lines.append(line)

        # At EOF, save the last paper if it exists
        if current_id is not None:
            papers.append({
                'paper_id': current_id,
                'text': "\n".join(current_text_lines)
            })

    return papers


def main():
    # 1. Parse the raw data
    print(f"[INFO] Parsing raw data from {RAW_DATA_FILE}")
    papers_list = parse_raw_text(RAW_DATA_FILE)

    # 2. Convert to DataFrame
    df = pd.DataFrame(papers_list, columns=['paper_id', 'text'])

    # Convert paper_id to integer if desired
    # (Might fail if the IDs are not purely numeric.)
    try:
        df['paper_id'] = df['paper_id'].astype(int)
    except ValueError:
        pass

    # 3. Save to CSV
    print(f"[INFO] Saving structured data to {OUTPUT_CSV} (found {len(df)} records)")
    df.to_csv(OUTPUT_CSV, index=False)


if __name__ == "__main__":
    main()
