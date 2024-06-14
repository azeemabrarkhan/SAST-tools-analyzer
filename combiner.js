import Analyzer from "./analyzer.js";
import {
  makeDir,
  readJsonFileSync,
  writeFile,
  readFile,
} from "./services/file.js";
import { getLinesFromString } from "./utils/text.js";

export default class Combiner {
  found;
  notFound;
  notRecognizedPatches;
  recordsToAnalyze;
  analyzer;
  analysisLevel;
  toolOrLogicName;
  selectedToolsNames;

  constructor() {
    this.found = [];
    this.notFound = [];
    this.notRecognizedPatches = [];
    this.recordsToAnalyze = readJsonFileSync(
      `${process.cwd()}/${
        process.env.RECORDS_TO_ANALYZE
      }/downloadedRecords.json`
    );
    this.analyzer = new Analyzer();
    this.analysisLevel = "file";
    this.selectedToolsNames = [
      process.env.TOOL1_NAME,
      process.env.TOOL2_NAME,
      process.env.TOOL3_NAME,
    ];
  }

  printSelectedTools = () => {
    console.log(this.selectedToolsNames);
  };

  selectTool = (toolName) => {
    if (!this.selectedToolsNames.includes(toolName)) {
      this.selectedToolsNames.push(toolName);
    }
  };

  deselectTool = (toolName) => {
    this.selectedToolsNames = this.selectedToolsNames.filter(
      (selectedToolName) => selectedToolName !== toolName
    );
  };

  analyzeOnFileLevel = () => {
    this.analysisLevel = "file";
  };

  analyzeOnFunctionLevel = () => {
    this.analysisLevel = "function";
  };

  analyzeOnLineLevel = () => {
    this.analysisLevel = "line";
  };

  getFunctionNameWithLineNumer = (functions, lineNumber) => {
    const fs = functions
      .filter((f) => f.startLine <= lineNumber && f.endLine >= lineNumber)
      .sort((fA, fB) => fB.startLine - fA.startLine);
    return fs[0]?.name ?? lineNumber;
  };

  getTotalVulCount = () => {
    let downloadedRecordsWithoutDuplicates = [];
    if (this.analysisLevel === "file") {
      for (const downloadedRecord of this.recordsToAnalyze) {
        if (
          !downloadedRecordsWithoutDuplicates.find(
            (r) => r.vulPath === downloadedRecord.vulPath
          )
        ) {
          downloadedRecordsWithoutDuplicates.push(downloadedRecord);
        }
      }
      return downloadedRecordsWithoutDuplicates.length;
    } else if (this.analysisLevel === "function") {
      for (const downloadedRecord of this.recordsToAnalyze) {
        if (
          !downloadedRecordsWithoutDuplicates.find(
            (r) =>
              r.vulPath === downloadedRecord.vulPath &&
              this.getFunctionNameWithLineNumer(
                r.functionsInVul,
                r.lineNumber
              ) ===
                this.getFunctionNameWithLineNumer(
                  r.functionsInVul,
                  downloadedRecord.lineNumber
                )
          )
        ) {
          downloadedRecordsWithoutDuplicates.push(downloadedRecord);
        }
      }
      return downloadedRecordsWithoutDuplicates.length;
    } else {
      return this.recordsToAnalyze.length;
    }
  };

  setFoundAndNotFound = (results) => {
    this.found = [];
    this.notFound = [];
    for (const resultSlice of results.filter((r) =>
      r.vulPath.startsWith("vul/")
    )) {
      const actualVulsInTheCurrentFile = this.recordsToAnalyze.filter(
        (downloadedRecord) => downloadedRecord.vulPath === resultSlice.vulPath
      );

      let indexOfAlreadyFoundOrNotFound = -1;

      switch (this.analysisLevel) {
        case "file":
          if (actualVulsInTheCurrentFile.length > 0) {
            indexOfAlreadyFoundOrNotFound = this.found.findIndex(
              (r) => r.vulPath === resultSlice.vulPath
            );
            if (indexOfAlreadyFoundOrNotFound < 0) {
              this.found.push(resultSlice);
            } else {
              // todo
              this.found[indexOfAlreadyFoundOrNotFound].similarResults.push(
                resultSlice
              );
            }
          } else {
            indexOfAlreadyFoundOrNotFound = this.notFound.findIndex(
              (r) => r.vulPath === resultSlice.vulPath
            );
            if (indexOfAlreadyFoundOrNotFound < 0) {
              this.notFound.push(resultSlice);
            } else {
              // todo
              this.notFound[indexOfAlreadyFoundOrNotFound].similarResults.push(
                resultSlice
              );
            }
          }
          break;

        case "function":
          if (actualVulsInTheCurrentFile.length === 0) {
            indexOfAlreadyFoundOrNotFound = this.notFound.findIndex(
              (r) => r.vulPath === resultSlice.vulPath
            );
            if (indexOfAlreadyFoundOrNotFound < 0) {
              this.notFound.push(resultSlice);
            } else {
              // todo
              this.notFound[indexOfAlreadyFoundOrNotFound].similarResults.push(
                resultSlice
              );
            }
          } else {
            if (
              actualVulsInTheCurrentFile.find(
                (v) =>
                  this.getFunctionNameWithLineNumer(
                    v.functionsInVul,
                    v.lineNumber
                  ) ===
                  this.getFunctionNameWithLineNumer(
                    v.functionsInVul,
                    resultSlice.lineNumber
                  )
              )
            ) {
              indexOfAlreadyFoundOrNotFound = this.found.findIndex(
                (r) =>
                  r.vulPath === resultSlice.vulPath &&
                  this.getFunctionNameWithLineNumer(
                    actualVulsInTheCurrentFile[0].functionsInVul,
                    r.lineNumber
                  ) ===
                    this.getFunctionNameWithLineNumer(
                      actualVulsInTheCurrentFile[0].functionsInVul,
                      resultSlice.lineNumber
                    )
              );
              if (indexOfAlreadyFoundOrNotFound < 0) {
                this.found.push(resultSlice);
              } else {
                // todo
                this.found[indexOfAlreadyFoundOrNotFound].similarResults.push(
                  resultSlice
                );
              }
            } else {
              indexOfAlreadyFoundOrNotFound = this.notFound.findIndex(
                (r) =>
                  r.vulPath === resultSlice.vulPath &&
                  this.getFunctionNameWithLineNumer(
                    actualVulsInTheCurrentFile[0].functionsInVul,
                    r.lineNumber
                  ) ===
                    this.getFunctionNameWithLineNumer(
                      actualVulsInTheCurrentFile[0].functionsInVul,
                      resultSlice.lineNumber
                    )
              );
              if (indexOfAlreadyFoundOrNotFound < 0) {
                this.notFound.push(resultSlice);
              } else {
                // todo
                this.notFound[
                  indexOfAlreadyFoundOrNotFound
                ].similarResults.push(resultSlice);
              }
            }
          }
          break;

        case "line":
          if (
            actualVulsInTheCurrentFile.find(
              (v) => v.lineNumber === resultSlice.lineNumber
            )
          ) {
            this.found.push(resultSlice);
          } else {
            this.notFound.push(resultSlice);
          }
          break;
      }
    }
  };

  setNotRecognizedPatches = (results) => {
    this.notRecognizedPatches = [];

    for (const resultSlice of results.filter((r) =>
      r.vulPath.startsWith("fix/")
    )) {
      let downloadedRecords = this.recordsToAnalyze.filter(
        (downloadedRecord) => downloadedRecord.fixPath === resultSlice.vulPath
      );

      switch (this.analysisLevel) {
        case "file":
          if (
            this.found.find((f) =>
              downloadedRecords.find((r) => r.vulPath === f.vulPath)
            )
          ) {
            const alreadyFoundPatchNotRecognizedIndex =
              this.notRecognizedPatches.findIndex(
                (nr) => nr.vulPath === resultSlice.vulPath
              );
            if (alreadyFoundPatchNotRecognizedIndex < 0) {
              this.notRecognizedPatches.push(resultSlice);
            } else {
              this.notRecognizedPatches[
                alreadyFoundPatchNotRecognizedIndex
              ].similarResults.push(resultSlice);
            }
          }
          break;

        case "function":
          if (
            this.found.find((f) =>
              downloadedRecords.find(
                (r) =>
                  r.vulPath === f.vulPath &&
                  this.getFunctionNameWithLineNumer(
                    r.functionsInVul,
                    resultSlice.lineNumber
                  ) ===
                    this.getFunctionNameWithLineNumer(
                      r.functionsInVul,
                      f.lineNumber
                    )
              )
            )
          ) {
            const alreadyFoundPatchNotRecognizedIndex =
              this.notRecognizedPatches.findIndex(
                (nr) =>
                  nr.vulPath === resultSlice.vulPath &&
                  this.getFunctionNameWithLineNumer(
                    downloadedRecords[0].functionsInVul,
                    nr.lineNumber
                  ) ===
                    this.getFunctionNameWithLineNumer(
                      downloadedRecords[0].functionsInVul,
                      resultSlice.lineNumber
                    )
              );
            if (alreadyFoundPatchNotRecognizedIndex < 0) {
              this.notRecognizedPatches.push(resultSlice);
            } else {
              this.notRecognizedPatches[
                alreadyFoundPatchNotRecognizedIndex
              ].similarResults.push(resultSlice);
            }
          }
          break;

        case "line":
          const fixedFunctionName = this.getFunctionNameWithLineNumer(
            downloadedRecords[0].functionsInFix,
            resultSlice.lineNumber
          );
          const fixedFunction = downloadedRecords[0].functionsInFix.find(
            (func) => fixedFunctionName === func.name
          );
          const fixedCode = getLinesFromString(
            readFile(`${process.env.FILES_BASE_PATH}/${resultSlice.vulPath}`),
            fixedFunction?.startLine,
            fixedFunction?.endLine
          );
          if (
            this.found.find(
              (f) =>
                fixedCode.includes(f.foundVulLine) &&
                downloadedRecords.find((r) => r.vulPath === f.vulPath)
            )
          ) {
            this.notRecognizedPatches.push(resultSlice);
          }
          break;
      }
    }
  };

  evaluateIndividualTool = (toolName) => {
    let toolResult;

    switch (toolName) {
      case process.env.TOOL1_NAME:
        toolResult = readJsonFileSync(
          `${process.cwd()}/formattedResults/formattedResult-${
            process.env.TOOL1_NAME
          }.json`
        );
        this.toolOrLogicName = process.env.TOOL1_NAME?.toUpperCase();
        break;

      case process.env.TOOL2_NAME:
        toolResult = readJsonFileSync(
          `${process.cwd()}/formattedResults/formattedResult-${
            process.env.TOOL2_NAME
          }.json`
        );
        this.toolOrLogicName = process.env.TOOL2_NAME?.toUpperCase();
        break;

      case process.env.TOOL3_NAME:
        toolResult = readJsonFileSync(
          `${process.cwd()}/formattedResults/formattedResult-${
            process.env.TOOL3_NAME
          }.json`
        );
        this.toolOrLogicName = process.env.TOOL3_NAME?.toUpperCase();
        break;
    }

    this.processResults(toolResult);
  };

  withAndLogic = () => {
    this.toolOrLogicName = "AND LOGIC";
    const fileNames = this.selectedToolsNames.map(
      (selectedToolName) => `formattedResult-${selectedToolName}.json`
    );
    let toolResults = [];
    const results = [];

    for (let i = 0; i < fileNames.length; i++) {
      const toolResult = readJsonFileSync(
        `${process.cwd()}/formattedResults/${fileNames[i]}`
      );
      if (toolResult) toolResults.push(toolResult);
    }

    for (const vul of toolResults[0]) {
      let isVulnerable = true;

      const functionsInTheCurrentFile =
        this.recordsToAnalyze.find(
          (downloadedRecord) => downloadedRecord.vulPath === vul.vulPath
        )?.functionsInVul ?? [];

      let indexOfAlreadyFound = -1;

      switch (this.analysisLevel) {
        case "file":
          indexOfAlreadyFound = results.findIndex(
            (r) => r.vulPath === vul.vulPath
          );
          break;
        case "function":
          indexOfAlreadyFound = results.findIndex(
            (r) =>
              r.vulPath === vul.vulPath &&
              this.getFunctionNameWithLineNumer(
                functionsInTheCurrentFile,
                r.lineNumber
              ) ===
                this.getFunctionNameWithLineNumer(
                  functionsInTheCurrentFile,
                  vul.lineNumber
                )
          );
          break;
      }

      for (let i = 1; i < toolResults.length && isVulnerable; i++) {
        const toolResult = toolResults[i];

        let indexOfCurrentTool = -1;

        switch (this.analysisLevel) {
          case "file":
            indexOfCurrentTool = toolResult.findIndex(
              (result) => result.vulPath === vul.vulPath
            );
            isVulnerable = indexOfCurrentTool >= 0 && indexOfAlreadyFound < 0;
            if (indexOfCurrentTool >= 0) {
              vul.similarResults.push(toolResult[indexOfCurrentTool]);
            }
            break;

          case "function":
            indexOfCurrentTool = toolResult.findIndex(
              (v) =>
                v.vulPath === vul.vulPath &&
                this.getFunctionNameWithLineNumer(
                  functionsInTheCurrentFile,
                  v.lineNumber
                ) ===
                  this.getFunctionNameWithLineNumer(
                    functionsInTheCurrentFile,
                    vul.lineNumber
                  )
            );
            isVulnerable = indexOfCurrentTool >= 0 && indexOfAlreadyFound < 0;
            if (indexOfCurrentTool >= 0) {
              vul.similarResults.push(toolResult[indexOfCurrentTool]);
            }
            break;

          case "line":
            indexOfCurrentTool = toolResult.findIndex(
              (v) =>
                v.vulPath === vul.vulPath && v.lineNumber === vul.lineNumber
            );
            isVulnerable = indexOfCurrentTool >= 0;
            if (indexOfCurrentTool >= 0) {
              vul.similarResults.push(toolResult[indexOfCurrentTool]);
            }
            break;
        }
      }

      if (indexOfAlreadyFound >= 0) {
        // todo
        results[indexOfAlreadyFound].similarResults.push(vul);
      }

      if (isVulnerable) {
        results.push(vul);
      }
    }

    this.processResults(results);
  };

  withOrLogic = () => {
    this.toolOrLogicName = "OR LOGIC";
    const fileNames = this.selectedToolsNames.map(
      (selectedToolName) => `formattedResult-${selectedToolName}.json`
    );
    let results = [];

    for (let i = 0; i < fileNames.length; i++) {
      const toolResult = readJsonFileSync(
        `${process.cwd()}/formattedResults/${fileNames[i]}`
      );
      if (toolResult) {
        for (const result of toolResult) {
          let indexOfAlreadyFound;

          const functionsInTheCurrentFile =
            this.recordsToAnalyze.find(
              (downloadedRecord) => downloadedRecord.vulPath === result.vulPath
            )?.functionsInVul ?? [];

          switch (this.analysisLevel) {
            case "file":
              indexOfAlreadyFound = results.findIndex(
                (r) => r.vulPath === result.vulPath
              );
              if (indexOfAlreadyFound >= 0) {
                // todo
                results[indexOfAlreadyFound].similarResults.push(result);
              }
              break;

            case "function":
              indexOfAlreadyFound = results.findIndex(
                (r) =>
                  r.vulPath === result.vulPath &&
                  this.getFunctionNameWithLineNumer(
                    functionsInTheCurrentFile,
                    r.lineNumber
                  ) ===
                    this.getFunctionNameWithLineNumer(
                      functionsInTheCurrentFile,
                      result.lineNumber
                    )
              );
              if (indexOfAlreadyFound >= 0) {
                // todo
                results[indexOfAlreadyFound].similarResults.push(result);
              }
              break;

            case "line":
              indexOfAlreadyFound = results.findIndex(
                (r) =>
                  r.vulPath === result.vulPath &&
                  r.lineNumber === result.lineNumber
              );
              if (indexOfAlreadyFound >= 0) {
                // todo
                results[indexOfAlreadyFound].similarResults.push(result);
              }
              break;
          }

          if (indexOfAlreadyFound < 0) {
            results.push(result);
          }
        }
      }
    }

    this.processResults(results);
  };

  processResults = (results) => {
    if (
      this.toolOrLogicName === "OR LOGIC" ||
      this.toolOrLogicName === "AND LOGIC"
    ) {
      this.printSelectedTools();
    }
    console.log(
      `***${this.toolOrLogicName}*** - ${this.analysisLevel.toUpperCase()}`
    );
    this.setFoundAndNotFound(results);
    this.setNotRecognizedPatches(results);
    this.saveResultFile();
    this.analyzer.evaluateResult(
      this.found,
      this.notFound,
      this.notRecognizedPatches,
      this.getTotalVulCount()
    );
  };

  saveResultFile = () => {
    let path = `./output/${this.toolOrLogicName}/`;
    if (
      this.toolOrLogicName === "OR LOGIC" ||
      this.toolOrLogicName === "AND LOGIC"
    ) {
      path += `${this.selectedToolsNames.join("_")}`;
    }
    makeDir(path);
    writeFile(
      `${path}/${this.analysisLevel}_true_positives.json`,
      JSON.stringify(this.found, null, 4)
    );
    writeFile(
      `${path}/${this.analysisLevel}_false_positives.json`,
      JSON.stringify(this.notFound, null, 4)
    );
    writeFile(
      `${path}/${this.analysisLevel}_not_recognized_patches.json`,
      JSON.stringify(this.notRecognizedPatches, null, 4)
    );
  };

  withMajorityLogic = () => {};
}
