export * from "./auth";
export * from "./market-research";
export * from "./tasks";

import * as auth from "./auth";
import * as marketResearch from "./market-research";
import * as tasks from "./tasks";

export default {
  ...auth,
  ...marketResearch,
  ...tasks,
};
