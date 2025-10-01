import type { DataModel } from "../types";
import type { DataModelImplementation } from "./base";
import { SeparateTableModel } from "./separate-table";
import { JsonbModel } from "./jsonb";
import { SeparateColumnsModel } from "./separate-columns";

export function getModelImplementation(
  dataModel: DataModel,
): DataModelImplementation {
  switch (dataModel) {
    case "separate_table":
      return new SeparateTableModel(false);
    case "separate_table_indexed":
      return new SeparateTableModel(true);
    case "jsonb":
      return new JsonbModel(false);
    case "jsonb_indexed":
      return new JsonbModel(true);
    case "separate_columns":
      return new SeparateColumnsModel(false);
    case "separate_columns_indexed":
      return new SeparateColumnsModel(true);
    default:
      throw new Error(`Unknown data model: ${dataModel}`);
  }
}

export * from "./base";
