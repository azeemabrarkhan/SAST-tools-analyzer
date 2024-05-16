const testFunctions = [
  { name: "a", startLine: 1, endLine: 15, isVuln: true },
  { name: "b", startLine: 5, endLine: 7, isVuln: false },
  { name: "c", startLine: 8, endLine: 14, isVuln: false },
  { name: "d", startLine: 10, endLine: 12, isVuln: false },
  { name: "e", startLine: 16, endLine: 20, isVuln: true },
];

export const convertFunctionsInHierarchicalStructure = (functions) => {
  function getChildrenFunctionsNames(functionsP) {
    let childrenNames = [];

    functionsP.forEach((f) => {
      if (childrenNames.find((name) => name === f.name)) return;

      f.children = [];
      for (const ff of functionsP) {
        if (ff.name !== f.name) {
          if (
            ff.startLine >= f.startLine &&
            ff.endLine >= f.startLine &&
            ff.startLine <= f.endLine &&
            ff.endLine <= f.endLine
          ) {
            f.children.push(ff);
            childrenNames.push(ff.name);
          }
        }
      }

      const secondLevelChildren = getChildrenFunctionsNames(f.children);

      f.children = f.children.filter(
        (fff) => !secondLevelChildren.find((name) => name === fff.name)
      );
    });

    return childrenNames;
  }

  const childrenFunctionNames = getChildrenFunctionsNames(functions);
  return functions.filter(
    (f) => !childrenFunctionNames.find((name) => name === f.name)
  );
};

export const getInnerMostVulnerableFunctions = (functions) => {
  let vulnerableFunctions = [];

  const processChildren = (functionsP) => {
    functionsP.forEach((f) => {
      if (f.isVuln) {
        vulnerableFunctions.push(f);
      }

      const currentNumberOfVulnFuncs = vulnerableFunctions.length;

      if (f.children.length > 0) {
        processChildren(f.children);
      }

      if (f.isVuln && vulnerableFunctions.length > currentNumberOfVulnFuncs)
        vulnerableFunctions.splice(currentNumberOfVulnFuncs - 1, 1);
    });
  };

  processChildren(functions);
  return vulnerableFunctions;
};
