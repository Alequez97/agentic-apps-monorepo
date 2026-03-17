export function assertMethod(target, methodName, contractName) {
  if (typeof target?.[methodName] !== "function") {
    throw new Error(`${contractName} requires method ${methodName}()`);
  }
}
