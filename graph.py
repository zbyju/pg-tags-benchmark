import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np

# Set style
sns.set_style("whitegrid")
plt.rcParams["figure.figsize"] = (15, 10)

# Read the CSV and sort by totalDocuments
df = pd.read_csv("benchmark_averages.csv")
df = df.sort_values("totalDocuments")

# Define the order for data models to ensure consistency
model_order = ["separate_table", "separate_table_indexed", "jsonb", "jsonb_indexed"]

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
for model in model_order:
    model_data = df[df["dataModel"] == model].sort_values("totalDocuments")
    ax1.plot(
        model_data["totalDocuments"],
        model_data["avgInsertTimeMs"],
        marker="o",
        label=model.replace("_", " ").title(),
        color=colors[model],
        linewidth=3,
        markersize=10,
        alpha=0.8,
    )
ax1.set_xlabel("Total Documents", fontsize=13, fontweight="bold")
ax1.set_ylabel("Avg Insert Time (ms)", fontsize=13, fontweight="bold")
ax1.set_title("Insert Performance Comparison", fontsize=16, fontweight="bold", pad=20)
ax1.legend(fontsize=11, loc="best")
ax1.set_xscale("log")
ax1.set_yscale("log")
ax1.grid(True, alpha=0.3, linestyle="--")

# 2. Query 1 Performance (firstname in tags)
ax2 = plt.subplot(4, 2, 2)
for model in model_order:
    model_data = df[df["dataModel"] == model].sort_values("totalDocuments")
    ax2.plot(
        model_data["totalDocuments"],
        model_data["avgQuery1TimeMs"],
        marker="s",
        label=model.replace("_", " ").title(),
        color=colors[model],
        linewidth=3,
        markersize=10,
        alpha=0.8,
    )
ax2.set_xlabel("Total Documents", fontsize=13, fontweight="bold")
ax2.set_ylabel("Avg Query Time (ms)", fontsize=13, fontweight="bold")
ax2.set_title(
    "Query 1: Fetch by Firstname (Tags)", fontsize=16, fontweight="bold", pad=20
)
ax2.legend(fontsize=11, loc="best")
ax2.set_xscale("log")
ax2.set_yscale("log")
ax2.grid(True, alpha=0.3, linestyle="--")

# 3. Query 2 Performance (illness case id)
ax3 = plt.subplot(4, 2, 3)
for model in model_order:
    model_data = df[df["dataModel"] == model].sort_values("totalDocuments")
    ax3.plot(
        model_data["totalDocuments"],
        model_data["avgQuery2TimeMs"],
        marker="^",
        label=model.replace("_", " ").title(),
        color=colors[model],
        linewidth=3,
        markersize=10,
        alpha=0.8,
    )
ax3.set_xlabel("Total Documents", fontsize=13, fontweight="bold")
ax3.set_ylabel("Avg Query Time (ms)", fontsize=13, fontweight="bold")
ax3.set_title(
    "Query 2: Fetch by Illness Case ID", fontsize=16, fontweight="bold", pad=20
)
ax3.legend(fontsize=11, loc="best")
ax3.set_xscale("log")
ax3.set_yscale("log")
ax3.grid(True, alpha=0.3, linestyle="--")

# 4. Query 3 Performance (earliest 100 by published_at)
ax4 = plt.subplot(4, 2, 4)
for model in model_order:
    model_data = df[df["dataModel"] == model].sort_values("totalDocuments")
    ax4.plot(
        model_data["totalDocuments"],
        model_data["avgQuery3TimeMs"],
        marker="D",
        label=model.replace("_", " ").title(),
        color=colors[model],
        linewidth=3,
        markersize=10,
        alpha=0.8,
    )
ax4.set_xlabel("Total Documents", fontsize=13, fontweight="bold")
ax4.set_ylabel("Avg Query Time (ms)", fontsize=13, fontweight="bold")
ax4.set_title(
    "Query 3: Fetch Earliest 100 (ORDER BY)", fontsize=16, fontweight="bold", pad=20
)
ax4.legend(fontsize=11, loc="best")
ax4.set_xscale("log")
ax4.set_yscale("log")
ax4.grid(True, alpha=0.3, linestyle="--")

# 5. Direct Comparison at Specific Scale (50k documents)
ax5 = plt.subplot(4, 2, 5)
scale_50k = df[(df["totalDocuments"] >= 40000) & (df["totalDocuments"] <= 60000)].copy()
scale_50k = scale_50k.groupby("dataModel").first().reset_index()
scale_50k["dataModel"] = pd.Categorical(
    scale_50k["dataModel"], categories=model_order, ordered=True
)
scale_50k = scale_50k.sort_values("dataModel")

x = np.arange(len(model_order))
width = 0.2
ax5.bar(
    x - 1.5 * width,
    scale_50k["avgInsertTimeMs"],
    width,
    label="Insert",
    alpha=0.8,
    color="#1f77b4",
)
ax5.bar(
    x - 0.5 * width,
    scale_50k["avgQuery1TimeMs"],
    width,
    label="Query 1",
    alpha=0.8,
    color="#ff7f0e",
)
ax5.bar(
    x + 0.5 * width,
    scale_50k["avgQuery2TimeMs"],
    width,
    label="Query 2",
    alpha=0.8,
    color="#2ca02c",
)
ax5.bar(
    x + 1.5 * width,
    scale_50k["avgQuery3TimeMs"],
    width,
    label="Query 3",
    alpha=0.8,
    color="#d62728",
)
ax5.set_ylabel("Time (ms)", fontsize=13, fontweight="bold")
ax5.set_title("Performance at ~50k Documents", fontsize=16, fontweight="bold", pad=20)
ax5.set_xticks(x)
ax5.set_xticklabels(
    [m.replace("_", " ").title() for m in model_order],
    rotation=45,
    ha="right",
    fontsize=10,
)
ax5.legend(fontsize=11)
ax5.set_yscale("log")
ax5.grid(True, alpha=0.3, axis="y", linestyle="--")

# 6. Direct Comparison at Maximum Scale (~5M documents)
ax6 = plt.subplot(4, 2, 6)
max_scale = df[df["totalDocuments"] >= 4000000].copy()
max_scale = max_scale.groupby("dataModel").first().reset_index()
max_scale["dataModel"] = pd.Categorical(
    max_scale["dataModel"], categories=model_order, ordered=True
)
max_scale = max_scale.sort_values("dataModel")

x = np.arange(len(model_order))
width = 0.2
ax6.bar(
    x - 1.5 * width,
    max_scale["avgInsertTimeMs"],
    width,
    label="Insert",
    alpha=0.8,
    color="#1f77b4",
)
ax6.bar(
    x - 0.5 * width,
    max_scale["avgQuery1TimeMs"],
    width,
    label="Query 1",
    alpha=0.8,
    color="#ff7f0e",
)
ax6.bar(
    x + 0.5 * width,
    max_scale["avgQuery2TimeMs"],
    width,
    label="Query 2",
    alpha=0.8,
    color="#2ca02c",
)
ax6.bar(
    x + 1.5 * width,
    max_scale["avgQuery3TimeMs"],
    width,
    label="Query 3",
    alpha=0.8,
    color="#d62728",
)
ax6.set_ylabel("Time (ms)", fontsize=13, fontweight="bold")
ax6.set_title(
    "Performance at Maximum Scale (~5M documents)",
    fontsize=16,
    fontweight="bold",
    pad=20,
)
ax6.set_xticks(x)
ax6.set_xticklabels(
    [m.replace("_", " ").title() for m in model_order],
    rotation=45,
    ha="right",
    fontsize=10,
)
ax6.legend(fontsize=11)
ax6.set_yscale("log")
ax6.grid(True, alpha=0.3, axis="y", linestyle="--")

# 7. All Queries Combined - Average Performance Comparison
ax7 = plt.subplot(4, 2, 7)
for model in model_order:
    model_data = df[df["dataModel"] == model].sort_values("totalDocuments")
    avg_query = (
        model_data["avgQuery1TimeMs"]
        + model_data["avgQuery2TimeMs"]
        + model_data["avgQuery3TimeMs"]
    ) / 3
    ax7.plot(
        model_data["totalDocuments"],
        avg_query,
        marker="o",
        label=model.replace("_", " ").title(),
        color=colors[model],
        linewidth=3,
        markersize=10,
        alpha=0.8,
    )
ax7.set_xlabel("Total Documents", fontsize=13, fontweight="bold")
ax7.set_ylabel("Avg Query Time (ms)", fontsize=13, fontweight="bold")
ax7.set_title(
    "Average Query Performance Across All Queries",
    fontsize=16,
    fontweight="bold",
    pad=20,
)
ax7.legend(fontsize=11, loc="best")
ax7.set_xscale("log")
ax7.set_yscale("log")
ax7.grid(True, alpha=0.3, linestyle="--")

# 8. Side-by-Side Model Comparison at Key Scales
ax8 = plt.subplot(4, 2, 8)

# Select 4 representative scales
key_scales = df.sort_values("totalDocuments")["totalDocuments"].unique()
scale_indices = [0, len(key_scales) // 3, 2 * len(key_scales) // 3, -1]
selected_scales = [key_scales[i] for i in scale_indices]

comparison_data = df[df["totalDocuments"].isin(selected_scales)].copy()
comparison_data = comparison_data.sort_values(["totalDocuments", "dataModel"])

# Calculate total time (insert + avg of all queries)
comparison_data["total_time"] = (
    comparison_data["avgInsertTimeMs"]
    + comparison_data["avgQuery1TimeMs"]
    + comparison_data["avgQuery2TimeMs"]
    + comparison_data["avgQuery3TimeMs"]
) / 4

# Group by scale and model
groups = []
labels = []
for scale in selected_scales:
    scale_data = comparison_data[comparison_data["totalDocuments"] == scale]
    scale_data["dataModel"] = pd.Categorical(
        scale_data["dataModel"], categories=model_order, ordered=True
    )
    scale_data = scale_data.sort_values("dataModel")
    groups.append(scale_data)
    labels.append(f"{int(scale/1000)}k docs")

x = np.arange(len(model_order))
width = 0.2
bar_colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"]

for i, (group, label) in enumerate(zip(groups, labels)):
    offset = (i - 1.5) * width
    ax8.bar(
        x + offset,
        group["total_time"],
        width,
        label=label,
        alpha=0.8,
        color=bar_colors[i],
    )

ax8.set_ylabel("Avg Time (ms)", fontsize=13, fontweight="bold")
ax8.set_title(
    "Overall Performance at Key Scales", fontsize=16, fontweight="bold", pad=20
)
ax8.set_xticks(x)
ax8.set_xticklabels(
    [m.replace("_", " ").title() for m in model_order],
    rotation=45,
    ha="right",
    fontsize=10,
)
ax8.legend(fontsize=11, title="Scale", title_fontsize=11)
ax8.set_yscale("log")
ax8.grid(True, alpha=0.3, axis="y", linestyle="--")

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
