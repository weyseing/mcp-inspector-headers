import JsonView from "./JsonView";
import {
  CallToolResultSchema,
  CompatibilityCallToolResult,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { validateToolOutput, hasOutputSchema } from "@/utils/schemaUtils";

interface ToolResultsProps {
  toolResult: CompatibilityCallToolResult | null;
  selectedTool: Tool | null;
}

const checkContentCompatibility = (
  structuredContent: unknown,
  unstructuredContent: Array<{
    type: string;
    text?: string;
    [key: string]: unknown;
  }>,
): { isCompatible: boolean; message: string } => {
  if (
    unstructuredContent.length !== 1 ||
    unstructuredContent[0].type !== "text"
  ) {
    return {
      isCompatible: false,
      message: "Unstructured content is not a single text block",
    };
  }

  const textContent = unstructuredContent[0].text;
  if (!textContent) {
    return {
      isCompatible: false,
      message: "Text content is empty",
    };
  }

  try {
    const parsedContent = JSON.parse(textContent);
    const isEqual =
      JSON.stringify(parsedContent) === JSON.stringify(structuredContent);

    if (isEqual) {
      return {
        isCompatible: true,
        message: "Unstructured content matches structured content",
      };
    } else {
      return {
        isCompatible: false,
        message: "Parsed JSON does not match structured content",
      };
    }
  } catch {
    return {
      isCompatible: false,
      message: "Unstructured content is not valid JSON",
    };
  }
};

const ToolResults = ({ toolResult, selectedTool }: ToolResultsProps) => {
  if (!toolResult) return null;

  if ("content" in toolResult) {
    const parsedResult = CallToolResultSchema.safeParse(toolResult);
    if (!parsedResult.success) {
      return (
        <>
          <h4 className="font-semibold mb-2">Invalid Tool Result:</h4>
          <JsonView data={toolResult} />
          <h4 className="font-semibold mb-2">Errors:</h4>
          {parsedResult.error.errors.map((error, idx) => (
            <JsonView data={error} key={idx} />
          ))}
        </>
      );
    }
    const structuredResult = parsedResult.data;
    const isError = structuredResult.isError ?? false;

    let validationResult = null;
    const toolHasOutputSchema =
      selectedTool && hasOutputSchema(selectedTool.name);

    if (toolHasOutputSchema) {
      if (!structuredResult.structuredContent && !isError) {
        validationResult = {
          isValid: false,
          error:
            "Tool has an output schema but did not return structured content",
        };
      } else if (structuredResult.structuredContent) {
        validationResult = validateToolOutput(
          selectedTool.name,
          structuredResult.structuredContent,
        );
      }
    }

    let compatibilityResult = null;
    if (
      structuredResult.structuredContent &&
      structuredResult.content.length > 0 &&
      selectedTool &&
      hasOutputSchema(selectedTool.name)
    ) {
      compatibilityResult = checkContentCompatibility(
        structuredResult.structuredContent,
        structuredResult.content,
      );
    }

    return (
      <>
        <h4 className="font-semibold mb-2">
          Tool Result:{" "}
          {isError ? (
            <span className="text-red-600 font-semibold">Error</span>
          ) : (
            <span className="text-green-600 font-semibold">Success</span>
          )}
        </h4>
        {structuredResult.structuredContent && (
          <div className="mb-4">
            <h5 className="font-semibold mb-2 text-sm">Structured Content:</h5>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <JsonView data={structuredResult.structuredContent} />
              {validationResult && (
                <div
                  className={`mt-2 p-2 rounded text-sm ${
                    validationResult.isValid
                      ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                      : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                  }`}
                >
                  {validationResult.isValid ? (
                    "✓ Valid according to output schema"
                  ) : (
                    <>✗ Validation Error: {validationResult.error}</>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {!structuredResult.structuredContent &&
          validationResult &&
          !validationResult.isValid && (
            <div className="mb-4">
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 p-2 rounded text-sm">
                ✗ Validation Error: {validationResult.error}
              </div>
            </div>
          )}
        {structuredResult.content.length > 0 && (
          <div className="mb-4">
            {structuredResult.structuredContent && (
              <>
                <h5 className="font-semibold mb-2 text-sm">
                  Unstructured Content:
                </h5>
                {compatibilityResult && (
                  <div
                    className={`mb-2 p-2 rounded text-sm ${
                      compatibilityResult.isCompatible
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                        : "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                    }`}
                  >
                    {compatibilityResult.isCompatible ? "✓" : "⚠"}{" "}
                    {compatibilityResult.message}
                  </div>
                )}
              </>
            )}
            {structuredResult.content.map((item, index) => (
              <div key={index} className="mb-2">
                {item.type === "text" && (
                  <JsonView data={item.text} isError={isError} />
                )}
                {item.type === "image" && (
                  <img
                    src={`data:${item.mimeType};base64,${item.data}`}
                    alt="Tool result image"
                    className="max-w-full h-auto"
                  />
                )}
                {item.type === "resource" &&
                  (item.resource?.mimeType?.startsWith("audio/") ? (
                    <audio
                      controls
                      src={`data:${item.resource.mimeType};base64,${item.resource.blob}`}
                      className="w-full"
                    >
                      <p>Your browser does not support audio playback</p>
                    </audio>
                  ) : (
                    <JsonView data={item.resource} />
                  ))}
              </div>
            ))}
          </div>
        )}
      </>
    );
  } else if ("toolResult" in toolResult) {
    return (
      <>
        <h4 className="font-semibold mb-2">Tool Result (Legacy):</h4>
        <JsonView data={toolResult.toolResult} />
      </>
    );
  }

  return null;
};

export default ToolResults;
