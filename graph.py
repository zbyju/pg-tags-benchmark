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

# Define the order for data models to ensure consistency (dynamically detect available models)
all_models = ["separate_table", "separate_table_indexed", "jsonb", "jsonb_indexed", "separate_columns", "separate_columns_indexed"]
model_order = [m for m in all_models if m in df["dataModel"].unique()]

print(f"Found {len(model_order)} data models: {model_order}")
print(f"Found {len(df['totalDocuments'].unique())} unique document scales")
print(f"Scales: {sorted(df['totalDocuments'].unique())}")

# Create a figure with multiple subplots
fig = plt.figure(figsize=(20, 24))

# Color palette for data models
colors = {
    "separate_table": "#1f77b4",
    "separate_table_indexed": "#ff7f0e",
    "jsonb": "#2ca02c",
    "jsonb_indexed": "#d62728",
    "separate_columns": "#9467bd",
    "separate_columns_indexed": "#8c564b",
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

# 5. Direct Comparison at Small Scale
ax5 = plt.subplot(4, 2, 5)
# Get smallest scale that has data for all models
available_scales = sorted(df['totalDocuments'].unique())
small_scale = None
for scale in available_scales:
    scale_data = df[df["totalDocuments"] == scale]
    if len(scale_data) == len(model_order):
        small_scale = scale
        break

if small_scale is not None:
    scale_data = df[df["totalDocuments"] == small_scale].copy()
    scale_data["dataModel"] = pd.Categorical(
        scale_data["dataModel"], categories=model_order, ordered=True
    )
    scale_data = scale_data.sort_values("dataModel")

    # Group by query type instead of by model
    x = np.arange(4)  # 4 query types: Insert, Query1, Query2, Query3
    width = 0.8 / len(model_order)

    for i, model in enumerate(model_order):
        model_data = scale_data[scale_data["dataModel"] == model].iloc[0]
        offset = (i - len(model_order)/2 + 0.5) * width
        values = [
            model_data["avgInsertTimeMs"],
            model_data["avgQuery1TimeMs"],
            model_data["avgQuery2TimeMs"],
            model_data["avgQuery3TimeMs"]
        ]
        ax5.bar(
            x + offset,
            values,
            width,
            label=model.replace("_", " ").title(),
            alpha=0.8,
            color=colors[model]
        )

    ax5.set_ylabel("Time (ms)", fontsize=13, fontweight="bold")
    ax5.set_title(f"Performance at {int(small_scale)} Documents", fontsize=16, fontweight="bold", pad=20)
    ax5.set_xticks(x)
    ax5.set_xticklabels(["Insert", "Query 1", "Query 2", "Query 3"], fontsize=11)
    ax5.legend(fontsize=9, ncol=2)
    ax5.set_yscale("log")
    ax5.grid(True, alpha=0.3, axis="y", linestyle="--")
else:
    ax5.text(0.5, 0.5, "No complete data available", ha='center', va='center')

# 6. Direct Comparison at Large Scale
ax6 = plt.subplot(4, 2, 6)
# Get largest scale that has data for all models
large_scale = None
for scale in reversed(available_scales):
    scale_data = df[df["totalDocuments"] == scale]
    if len(scale_data) == len(model_order):
        large_scale = scale
        break

if large_scale is not None:
    scale_data = df[df["totalDocuments"] == large_scale].copy()
    scale_data["dataModel"] = pd.Categorical(
        scale_data["dataModel"], categories=model_order, ordered=True
    )
    scale_data = scale_data.sort_values("dataModel")

    # Group by query type instead of by model
    x = np.arange(4)  # 4 query types: Insert, Query1, Query2, Query3
    width = 0.8 / len(model_order)

    for i, model in enumerate(model_order):
        model_data = scale_data[scale_data["dataModel"] == model].iloc[0]
        offset = (i - len(model_order)/2 + 0.5) * width
        values = [
            model_data["avgInsertTimeMs"],
            model_data["avgQuery1TimeMs"],
            model_data["avgQuery2TimeMs"],
            model_data["avgQuery3TimeMs"]
        ]
        ax6.bar(
            x + offset,
            values,
            width,
            label=model.replace("_", " ").title(),
            alpha=0.8,
            color=colors[model]
        )

    ax6.set_ylabel("Time (ms)", fontsize=13, fontweight="bold")
    # Format large numbers nicely
    if large_scale >= 1000000:
        scale_label = f"{large_scale/1000000:.1f}M"
    elif large_scale >= 1000:
        scale_label = f"{large_scale/1000:.0f}K"
    else:
        scale_label = str(int(large_scale))
    ax6.set_title(f"Performance at {scale_label} Documents", fontsize=16, fontweight="bold", pad=20)
    ax6.set_xticks(x)
    ax6.set_xticklabels(["Insert", "Query 1", "Query 2", "Query 3"], fontsize=11)
    ax6.legend(fontsize=9, ncol=2)
    ax6.set_yscale("log")
    ax6.grid(True, alpha=0.3, axis="y", linestyle="--")
else:
    ax6.text(0.5, 0.5, "No complete data available", ha='center', va='center')

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

# 8. Model Comparison at Middle Scale
ax8 = plt.subplot(4, 2, 8)

# Get middle scale that has data for all models
middle_scale = None
mid_index = len(available_scales) // 2
# Search around middle for complete data
for offset in range(len(available_scales)):
    for direction in [0, 1, -1]:
        idx = mid_index + direction * offset
        if 0 <= idx < len(available_scales):
            scale = available_scales[idx]
            scale_data = df[df["totalDocuments"] == scale]
            if len(scale_data) == len(model_order):
                middle_scale = scale
                break
    if middle_scale is not None:
        break

if middle_scale is not None:
    scale_data = df[df["totalDocuments"] == middle_scale].copy()
    scale_data["dataModel"] = pd.Categorical(
        scale_data["dataModel"], categories=model_order, ordered=True
    )
    scale_data = scale_data.sort_values("dataModel")

    # Group by query type instead of by model
    x = np.arange(4)  # 4 query types: Insert, Query1, Query2, Query3
    width = 0.8 / len(model_order)

    for i, model in enumerate(model_order):
        model_data = scale_data[scale_data["dataModel"] == model].iloc[0]
        offset = (i - len(model_order)/2 + 0.5) * width
        values = [
            model_data["avgInsertTimeMs"],
            model_data["avgQuery1TimeMs"],
            model_data["avgQuery2TimeMs"],
            model_data["avgQuery3TimeMs"]
        ]
        ax8.bar(
            x + offset,
            values,
            width,
            label=model.replace("_", " ").title(),
            alpha=0.8,
            color=colors[model]
        )

    ax8.set_ylabel("Time (ms)", fontsize=13, fontweight="bold")
    # Format large numbers nicely
    if middle_scale >= 1000000:
        scale_label = f"{middle_scale/1000000:.1f}M"
    elif middle_scale >= 1000:
        scale_label = f"{middle_scale/1000:.0f}K"
    else:
        scale_label = str(int(middle_scale))
    ax8.set_title(f"Performance at {scale_label} Documents", fontsize=16, fontweight="bold", pad=20)
    ax8.set_xticks(x)
    ax8.set_xticklabels(["Insert", "Query 1", "Query 2", "Query 3"], fontsize=11)
    ax8.legend(fontsize=9, ncol=2)
    ax8.set_yscale("log")
    ax8.grid(True, alpha=0.3, axis="y", linestyle="--")
else:
    ax8.text(0.5, 0.5, "No complete data available", ha='center', va='center')

plt.tight_layout()
plt.savefig("benchmark_analysis.png", dpi=300, bbox_inches="tight")
print("Plot saved as 'benchmark_analysis.png'")

# Generate summary statistics
print("\n=== SUMMARY STATISTICS ===\n")

# Best performance for each metric
print("Best Insert Performance:")
best_insert = df.loc[df["avgInsertTimeMs"].idxmin()]
print(f"  Model: {best_insert['dataModel']}")
print(f"  Documents: {int(best_insert['totalDocuments'])}")
print(f"  Time: {best_insert['avgInsertTimeMs']:.2f} ms\n")

print("Best Query 1 Performance (Search by firstname):")
best_q1 = df.loc[df["avgQuery1TimeMs"].idxmin()]
print(f"  Model: {best_q1['dataModel']}")
print(f"  Documents: {int(best_q1['totalDocuments'])}")
print(f"  Time: {best_q1['avgQuery1TimeMs']:.2f} ms\n")

print("Best Query 2 Performance (Search by illness_case_id):")
best_q2 = df.loc[df["avgQuery2TimeMs"].idxmin()]
print(f"  Model: {best_q2['dataModel']}")
print(f"  Documents: {int(best_q2['totalDocuments'])}")
print(f"  Time: {best_q2['avgQuery2TimeMs']:.2f} ms\n")

print("Best Query 3 Performance (Fetch earliest 100 ordered):")
best_q3 = df.loc[df["avgQuery3TimeMs"].idxmin()]
print(f"  Model: {best_q3['dataModel']}")
print(f"  Documents: {int(best_q3['totalDocuments'])}")
print(f"  Time: {best_q3['avgQuery3TimeMs']:.2f} ms\n")

# Overall performance by model at largest scale
if large_scale is not None:
    print(f"=== PERFORMANCE AT LARGEST SCALE ({scale_label} documents) ===\n")
    large_data = df[df["totalDocuments"] == large_scale].sort_values("dataModel")
    for _, row in large_data.iterrows():
        print(f"{row['dataModel']}:")
        print(f"  Insert: {row['avgInsertTimeMs']:.2f} ms")
        print(f"  Query 1: {row['avgQuery1TimeMs']:.2f} ms")
        print(f"  Query 2: {row['avgQuery2TimeMs']:.2f} ms")
        print(f"  Query 3: {row['avgQuery3TimeMs']:.2f} ms")
        avg_query = (row['avgQuery1TimeMs'] + row['avgQuery2TimeMs'] + row['avgQuery3TimeMs']) / 3
        print(f"  Avg Query: {avg_query:.2f} ms\n")

plt.show()
