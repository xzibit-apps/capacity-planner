"use client";

import { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import { useSnackbarContext } from "@/contexts/SnackbarContext";

interface ImportResult {
  sheetName: string;
  sheetSlug: string;
  rowsImported: number;
  sampleData: Array<{
    rowNumber: number;
    cellCount: number;
    sampleCells: string[];
  }>;
}

interface ImportResponse {
  success: boolean;
  message: string;
  totalRowsImported: number;
  sheetsProcessed: number;
  results: ImportResult[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { showSnackbar } = useSnackbarContext();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Check if it's an Excel file
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
      ];
      
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setError(null);
        setImportResult(null);
      } else {
        setError("Please select a valid Excel file (.xlsx or .xls)");
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setIsImporting(true);
    setError(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-excel-multi', {
        method: 'POST',
        body: formData,
      });

      const result: ImportResponse = await response.json();

      if (result.success) {
        setImportResult(result);
        showSnackbar(result.message, "success");
      } else {
        setError(result.message || "Import failed");
        showSnackbar(result.message || "Import failed", "error");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Failed to import file";
      setError(errorMessage);
      showSnackbar(errorMessage, "error");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
        p: 4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          maxWidth: 800,
          width: "100%",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h3"
            component="h1"
            gutterBottom
            sx={{
              background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontWeight: 700,
              textAlign: "center",
              mb: 3,
            }}
          >
            Multi-Sheet Excel Import
          </Typography>

                     <Typography
             variant="body1"
             color="text.secondary"
             sx={{ textAlign: "center", mb: 4 }}
           >
             Import your Excel file with multiple sheets. Each sheet will be imported separately with Excel cell references (A1, B2, etc.).
             <br />
             <strong>Note:</strong> Existing data will be cleared before importing new data.
           </Typography>

          {/* File Upload Section */}
          <Box
            sx={{
              border: "2px dashed #cbd5e1",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              mb: 3,
              backgroundColor: "#f8fafc",
              transition: "all 0.3s ease",
              "&:hover": {
                borderColor: "#1e40af",
                backgroundColor: "#f1f5f9",
              },
            }}
          >
            <input
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                sx={{
                  mb: 2,
                  borderColor: "#1e40af",
                  color: "#1e40af",
                  "&:hover": {
                    borderColor: "#1e3a8a",
                    backgroundColor: "#1e40af",
                    color: "white",
                  },
                }}
              >
                Choose Excel File
              </Button>
            </label>

            {file && (
              <Box sx={{ mt: 2 }}>
                <Chip
                  label={file.name}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </Typography>
              </Box>
            )}
          </Box>

          {/* Error Display */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Import Button */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={!file || isImporting}
              sx={{
                background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)",
                px: 4,
                py: 1.5,
                fontSize: "1.1rem",
                fontWeight: 600,
                "&:hover": {
                  background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
                  transform: "translateY(-1px)",
                },
                "&:disabled": {
                  background: "#cbd5e1",
                },
              }}
            >
              {isImporting ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1, color: "white" }} />
                  Importing...
                </>
              ) : (
                "Start Multi-Sheet Import"
              )}
            </Button>
          </Box>

          {/* Import Results */}
          {importResult && (
            <Box sx={{ mt: 4 }}>
              <Alert severity="success" sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Import Successful! 🎉
                </Typography>
                <Typography variant="body2">
                  {importResult.message}
                </Typography>
              </Alert>

              <Card sx={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ color: "#1e40af" }}>
                    Import Summary
                  </Typography>
                  
                  <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                    <Chip
                      label={`${importResult.totalRowsImported} Total Rows`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`${importResult.sheetsProcessed} Sheets Processed`}
                      color="success"
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                    Sheet Details:
                  </Typography>

                  <List sx={{ backgroundColor: "white", borderRadius: 1 }}>
                    {importResult.results.map((result, index) => (
                      <Box key={result.sheetName}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {result.sheetName}
                                </Typography>
                                <Chip
                                  label={`${result.rowsImported} rows`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  Sheet Slug: {result.sheetSlug}
                                </Typography>
                                {result.sampleData.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2" color="text.secondary" gutterBottom>
                                      Sample Data:
                                    </Typography>
                                    {result.sampleData.map((sample, idx) => (
                                      <Box key={idx} sx={{ ml: 2, mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          Row {sample.rowNumber}: {sample.cellCount} cells 
                                          ({sample.sampleCells.join(", ")})
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < importResult.results.length - 1 && <Divider />}
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
