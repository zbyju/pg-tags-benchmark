import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set style
sns.set_style("whitegrid")
plt.rcParams["figure.figsize"] = (15, 10)

# Read the CSV
df = pd.read_csv("benchmark_averages.csv")

# Create a figure with multiple subplots
fig = plt.figure(figsize=(20, 24))

# Color palette for data models
colors = {
    "separate_table": "#1f77b4",
    "separate_table_indexed": "#ff7f0e",
    "jsonb": "#2ca02c",
    "jsonb_indexed": "#d62728",
}

# 1. Insert Performance Comparison
ax1 = plt.subplot(4, 2, 1)
for model in df["dataModel"].unique():
    model_data = df[df["dataModel"] == model]
    ax1.plot(
        model_data["totalDocuments"],
        model_data["avgInsertTimeMs"],
        marker="o",
        label=model,
        color=colors[model],
        linewidth=2,
        markersize=8,
    )
ax1.set_xlabel("Total Documents", fontsize=12)
ax1.set_ylabel("Avg Insert Time (ms)", fontsize=12)
ax1.set_title("Insert Performance by Data Model", fontsize=14, fontweight="bold")
ax1.legend()
ax1.set_xscale("log")
ax1.set_yscale("log")
ax1.grid(True, alpha=0.3)

# 2. Query 1 Performance (firstname in tags)
ax2 = plt.subplot(4, 2, 2)
for model in df["dataModel"].unique():
    model_data = df[df["dataModel"] == model]
    ax2.plot(
        model_data["totalDocuments"],
        model_data["avgQuery1TimeMs"],
        marker="s",
        label=model,
        color=colors[model],
        linewidth=2,
        markersize=8,
    )
ax2.set_xlabel("Total Documents", fontsize=12)
ax2.set_ylabel("Avg Query Time (ms)", fontsize=12)
ax2.set_title("Query 1: Fetch by Firstname (Tags)", fontsize=14, fontweight="bold")
ax2.legend()
ax2.set_xscale("log")
ax2.set_yscale("log")
ax2.grid(True, alpha=0.3)

# 3. Query 2 Performance (illness case id)
ax3 = plt.subplot(4, 2, 3)
for model in df["dataModel"].unique():
    model_data = df[df["dataModel"] == model]
    ax3.plot(
        model_data["totalDocuments"],
        model_data["avgQuery2TimeMs"],
        marker="^",
        label=model,
        color=colors[model],
        linewidth=2,
        markersize=8,
    )
ax3.set_xlabel("Total Documents", fontsize=12)
ax3.set_ylabel("Avg Query Time (ms)", fontsize=12)
ax3.set_title("Query 2: Fetch by Illness Case ID", fontsize=14, fontweight="bold")
ax3.legend()
ax3.set_xscale("log")
ax3.set_yscale("log")
ax3.grid(True, alpha=0.3)

# 4. Query 3 Performance (earliest 100 by published_at)
ax4 = plt.subplot(4, 2, 4)
for model in df["dataModel"].unique():
    model_data = df[df["dataModel"] == model]
    ax4.plot(
        model_data["totalDocuments"],
        model_data["avgQuery3TimeMs"],
        marker="D",
        label=model,
        color=colors[model],
        linewidth=2,
        markersize=8,
    )
ax4.set_xlabel("Total Documents", fontsize=12)
ax4.set_ylabel("Avg Query Time (ms)", fontsize=12)
ax4.set_title("Query 3: Fetch Earliest 100 (ORDER BY)", fontsize=14, fontweight="bold")
ax4.legend()
ax4.set_xscale("log")
ax4.set_yscale("log")
ax4.grid(True, alpha=0.3)

# 5. Heatmap for Insert Performance
ax5 = plt.subplot(4, 2, 5)
pivot_insert = df.pivot_table(
    values="avgInsertTimeMs", index="documentsPerCase", columns="dataModel"
)
sns.heatmap(
    pivot_insert, annot=True, fmt=".0f", cmap="YlOrRd", ax=ax5, cbar_kws={"label": "ms"}
)
ax5.set_title("Insert Time Heatmap (ms)", fontsize=14, fontweight="bold")
ax5.set_xlabel("Data Model", fontsize=12)
ax5.set_ylabel("Documents Per Case", fontsize=12)

# 6. Bar chart: Performance at maximum scale (100k cases, 50 docs/case)
ax6 = plt.subplot(4, 2, 6)
max_scale = df[(df["illnessCases"] == 100000) & (df["documentsPerCase"] == 50)]
x = np.arange(len(max_scale))
width = 0.2
ax6.bar(x - 1.5 * width, max_scale["avgInsertTimeMs"], width, label="Insert", alpha=0.8)
ax6.bar(
    x - 0.5 * width, max_scale["avgQuery1TimeMs"], width, label="Query 1", alpha=0.8
)
ax6.bar(
    x + 0.5 * width, max_scale["avgQuery2TimeMs"], width, label="Query 2", alpha=0.8
)
ax6.bar(
    x + 1.5 * width, max_scale["avgQuery3TimeMs"], width, label="Query 3", alpha=0.8
)
ax6.set_ylabel("Time (ms)", fontsize=12)
ax6.set_title(
    "Performance at Max Scale (100k cases, 50 docs/case)",
    fontsize=14,
    fontweight="bold",
)
ax6.set_xticks(x)
ax6.set_xticklabels(max_scale["dataModel"], rotation=45, ha="right")
ax6.legend()
ax6.set_yscale("log")
ax6.grid(True, alpha=0.3, axis="y")

# 7. Impact of Documents Per Case on Query Performance
ax7 = plt.subplot(4, 2, 7)
cases_10k = df[df["illnessCases"] == 10000]
for model in df["dataModel"].unique():
    model_data = cases_10k[cases_10k["dataModel"] == model]
    avg_query = (
        model_data["avgQuery1TimeMs"]
        + model_data["avgQuery2TimeMs"]
        + model_data["avgQuery3TimeMs"]
    ) / 3
    ax7.plot(
        model_data["documentsPerCase"],
        avg_query,
        marker="o",
        label=model,
        color=colors[model],
        linewidth=2,
        markersize=8,
    )
ax7.set_xlabel("Documents Per Case", fontsize=12)
ax7.set_ylabel("Avg Query Time (ms)", fontsize=12)
ax7.set_title(
    "Query Performance vs Documents/Case (10k cases)", fontsize=14, fontweight="bold"
)
ax7.legend()
ax7.set_yscale("log")
ax7.grid(True, alpha=0.3)

# 8. Speedup Factor with Indexing
ax8 = plt.subplot(4, 2, 8)
separate_base = df[df["dataModel"] == "separate_table"].set_index(
    ["illnessCases", "documentsPerCase"]
)
separate_idx = df[df["dataModel"] == "separate_table_indexed"].set_index(
    ["illnessCases", "documentsPerCase"]
)
jsonb_base = df[df["dataModel"] == "jsonb"].set_index(
    ["illnessCases", "documentsPerCase"]
)
jsonb_idx = df[df["dataModel"] == "jsonb_indexed"].set_index(
    ["illnessCases", "documentsPerCase"]
)

# Calculate speedup for Query 2 (most dramatic differences)
speedup_data = []
for idx in separate_base.index:
    if idx in separate_idx.index:
        speedup_data.append(
            {
                "totalDocs": separate_base.loc[idx, "totalDocuments"],
                "separate_speedup": separate_base.loc[idx, "avgQuery2TimeMs"]
                / max(separate_idx.loc[idx, "avgQuery2TimeMs"], 0.1),
                "jsonb_speedup": jsonb_base.loc[idx, "avgQuery2TimeMs"]
                / max(jsonb_idx.loc[idx, "avgQuery2TimeMs"], 0.1),
            }
        )

speedup_df = pd.DataFrame(speedup_data)
ax8.plot(
    speedup_df["totalDocs"],
    speedup_df["separate_speedup"],
    marker="o",
    label="Separate Table",
    color=colors["separate_table"],
    linewidth=2,
    markersize=8,
)
ax8.plot(
    speedup_df["totalDocs"],
    speedup_df["jsonb_speedup"],
    marker="s",
    label="JSONB",
    color=colors["jsonb"],
    linewidth=2,
    markersize=8,
)
ax8.axhline(y=1, color="gray", linestyle="--", alpha=0.5, label="No speedup")
ax8.set_xlabel("Total Documents", fontsize=12)
ax8.set_ylabel("Speedup Factor (Query 2)", fontsize=12)
ax8.set_title("Indexing Speedup Factor", fontsize=14, fontweight="bold")
ax8.legend()
ax8.set_xscale("log")
ax8.set_yscale("log")
ax8.grid(True, alpha=0.3)

plt.tight_layout()
plt.savefig("benchmark_analysis.png", dpi=300, bbox_inches="tight")
print("Plot saved as 'benchmark_analysis.png'")

# Generate summary statistics
print("\n=== SUMMARY STATISTICS ===\n")
print("Best Insert Performance:")
print(
    df.loc[df["avgInsertTimeMs"].idxmin()][
        ["dataModel", "totalDocuments", "avgInsertTimeMs"]
    ]
)
print("\nBest Query 1 Performance:")
print(
    df.loc[df["avgQuery1TimeMs"].idxmin()][
        ["dataModel", "totalDocuments", "avgQuery1TimeMs"]
    ]
)
print("\nBest Query 2 Performance:")
print(
    df.loc[df["avgQuery2TimeMs"].idxmin()][
        ["dataModel", "totalDocuments", "avgQuery2TimeMs"]
    ]
)
print("\nBest Query 3 Performance:")
print(
    df.loc[df["avgQuery3TimeMs"].idxmin()][
        ["dataModel", "totalDocuments", "avgQuery3TimeMs"]
    ]
)

plt.show()
