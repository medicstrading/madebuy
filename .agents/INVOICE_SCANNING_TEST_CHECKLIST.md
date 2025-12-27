# Invoice Scanning Feature - Testing Checklist

## Overview
This checklist covers manual testing for the complete invoice scanning workflow, from upload to material creation.

**Test Date**: _____________
**Tester**: _____________
**Browser**: _____________
**Environment**: Development (localhost:3301)

---

## 1. File Upload Tests

### 1.1 Valid File Upload
- [ ] **PDF Upload**: Upload a valid PDF invoice (< 20MB)
  - Expected: File preview shows, upload button enabled
  - Expected: Success toast appears after upload
- [ ] **JPG Upload**: Upload a valid JPG invoice (< 20MB)
  - Expected: Image preview displays, upload button enabled
  - Expected: Success toast appears after upload
- [ ] **PNG Upload**: Upload a valid PNG invoice (< 20MB)
  - Expected: Image preview displays, upload button enabled
  - Expected: Success toast appears after upload

### 1.2 File Validation
- [ ] **File Too Large**: Try uploading a file > 20MB
  - Expected: Error toast: "File size must be less than 20MB"
  - Expected: File rejected, no upload
- [ ] **Invalid File Type**: Try uploading .docx, .xlsx, or .txt
  - Expected: Error toast: "Only PDF, JPG, and PNG files are allowed"
  - Expected: File rejected, no upload
- [ ] **No File Selected**: Click "Upload and Process" without selecting a file
  - Expected: Upload button should be disabled (cannot test)

### 1.3 Drag & Drop
- [ ] **Valid File Drag & Drop**: Drag a valid PDF/JPG/PNG into the drop zone
  - Expected: File is accepted and preview shows
- [ ] **Invalid File Drag & Drop**: Drag an invalid file type
  - Expected: Error toast appears, file rejected

### 1.4 UI Feedback
- [ ] **Loading States**: After clicking "Upload and Process"
  - Expected: Button shows "Uploading..." with spinner
  - Expected: Button shows "Processing with OCR..." after upload
  - Expected: Blue info box appears: "Processing Invoice... Extracting text..."
- [ ] **Cancel During Upload**: Click "Remove" after selecting file
  - Expected: File removed, upload form resets

---

## 2. OCR Processing Tests

### 2.1 Successful Processing
- [ ] **Simple Invoice**: Upload a clear, well-formatted invoice
  - Expected: Processing completes within 5-10 seconds
  - Expected: Success toast: "Extracted X line items"
  - Expected: Redirect to review page
- [ ] **Complex Invoice**: Upload an invoice with 20+ line items
  - Expected: All line items extracted (verify count)
  - Expected: Processing takes < 15 seconds

### 2.2 OCR Accuracy
- [ ] **Name Extraction**: Verify material names are extracted
  - Expected: Names appear in "Material Name" column
  - Check: Are names reasonably accurate? (70%+ accuracy)
- [ ] **Price Extraction**: Verify prices are extracted
  - Expected: Prices appear in "Price" column
  - Check: Are prices correct? (decimal formatting)
- [ ] **Quantity Extraction**: Verify quantities are extracted
  - Expected: Quantities appear in "Quantity" column
  - Check: Are quantities correct?
- [ ] **Unit Extraction**: Verify units are extracted
  - Expected: Units appear in "Unit" dropdown
  - Check: Are units correct? (gram, kg, piece, etc.)

### 2.3 Confidence Scores
- [ ] **High Confidence (70%+)**: Check items with green confidence bars
  - Expected: Green progress bar for confidence >= 70%
- [ ] **Medium Confidence (50-69%)**: Check items with yellow bars
  - Expected: Yellow progress bar for confidence 50-69%
- [ ] **Low Confidence (<50%)**: Check items with red bars
  - Expected: Red progress bar for confidence < 50%

### 2.4 Error Handling
- [ ] **OCR Failure**: Upload a completely blank image
  - Expected: Error toast appears
  - Expected: Invoice status set to "error"
- [ ] **Network Error**: Disconnect network during processing
  - Expected: Error toast with meaningful message
  - Expected: Invoice status set to "error"

---

## 3. Review Page Tests

### 3.1 Data Display
- [ ] **Invoice Metadata**: Check header shows filename and supplier
  - Expected: Filename displayed
  - Expected: Supplier displayed if extracted
- [ ] **Line Items Table**: Verify all columns display correctly
  - Expected: Material Name, Quantity, Unit, Price, Confidence, Action columns
- [ ] **Raw Text**: Check "Raw:" text under each material name
  - Expected: Shows original OCR text for reference

### 3.2 Data Editing
- [ ] **Edit Material Name**: Change a material name
  - Expected: Input updates immediately
  - Expected: Changes persist when clicking "Confirm & Save"
- [ ] **Edit Quantity**: Change a quantity value
  - Expected: Input accepts decimals (e.g., 2.5)
  - Expected: Changes save correctly
- [ ] **Edit Price**: Change a price value
  - Expected: Input accepts decimals (e.g., 12.99)
  - Expected: Changes save correctly
- [ ] **Change Unit**: Select different unit from dropdown
  - Expected: Dropdown updates
  - Expected: New unit saves correctly

### 3.3 Action Selection
- [ ] **Create New Material**: Set action to "Create New"
  - Expected: Row remains fully opaque
  - Expected: Material will be created on save
- [ ] **Skip Item**: Set action to "Skip"
  - Expected: Row becomes semi-transparent (opacity-50)
  - Expected: Item excluded from save count

### 3.4 Validation
- [ ] **Missing Name**: Leave material name blank, try to save
  - Expected: Error toast: "Please fill in name, price, and quantity for all items"
  - Expected: Save blocked
- [ ] **Missing Price**: Leave price blank, try to save
  - Expected: Error toast: "Please fill in name, price, and quantity for all items"
  - Expected: Save blocked
- [ ] **Missing Quantity**: Leave quantity blank, try to save
  - Expected: Error toast: "Please fill in name, price, and quantity for all items"
  - Expected: Save blocked
- [ ] **All Items Skipped**: Skip all items, try to save
  - Expected: Error toast: "Please select at least one item to save"
  - Expected: Save blocked

### 3.5 Save & Confirm
- [ ] **Successful Save**: Fill all required fields, click "Confirm & Save"
  - Expected: Button shows "Saving..." with spinner
  - Expected: Success toast: "Successfully created X materials"
  - Expected: Redirect to materials page after 1 second
- [ ] **Cancel**: Click "Cancel" button
  - Expected: Redirect to invoice scan page
  - Expected: No materials created

---

## 4. Invoice History Page Tests

### 4.1 Stats Cards
- [ ] **Total Invoices**: Check total invoice count
  - Expected: Matches number of uploaded invoices
- [ ] **Processed Count**: Check processed count
  - Expected: Shows only successfully processed invoices
- [ ] **Pending Count**: Check pending count
  - Expected: Shows invoices not yet processed

### 4.2 Invoice List Table
- [ ] **File Name Column**: Verify file names display
  - Expected: Original filename shown
  - Expected: Invoice date shown if extracted
- [ ] **Supplier Column**: Check supplier data
  - Expected: Supplier name or "-" if not extracted
- [ ] **Uploaded Column**: Check upload timestamps
  - Expected: Formatted date (e.g., "Dec 26, 2025")
- [ ] **Line Items Column**: Check line item counts
  - Expected: Shows number of line items extracted
- [ ] **Status Column**: Check status badges
  - Expected: Green "Processed" badge for processed invoices
  - Expected: Yellow "Pending" badge for pending invoices
  - Expected: Red "Error" badge for failed invoices
- [ ] **Confidence Column**: Check confidence bars
  - Expected: Green bar for >= 70% confidence
  - Expected: Yellow bar for 50-69% confidence
  - Expected: Red bar for < 50% confidence

### 4.3 Navigation
- [ ] **Back to Materials**: Click "Back to Materials" link
  - Expected: Navigates to /dashboard/materials
- [ ] **Row Click**: Click on an invoice row
  - Expected: Navigates to invoice detail page
- [ ] **Empty State**: View page with no invoices
  - Expected: Shows empty state message
  - Expected: "Scan Invoice" button visible

---

## 5. Material Detail Page Tests

### 5.1 Material Display
- [ ] **View Created Material**: Navigate to a material created from invoice
  - Expected: All fields populated correctly
  - Expected: Name, category, quantity, unit, price all correct
- [ ] **Restock History**: Check invoice tracking section
  - Expected: Shows linked invoices that restocked this material
  - Expected: Shows invoice filenames and dates

---

## 6. Integration Tests

### 6.1 End-to-End Flow
- [ ] **Complete Workflow**: Upload → Process → Review → Save
  1. Upload a valid invoice (PDF/JPG/PNG)
  2. Wait for OCR processing
  3. Review extracted data
  4. Make edits if needed
  5. Confirm and save
  - Expected: Materials created successfully
  - Expected: Invoice appears in history with "Processed" status
  - Expected: Materials appear in materials list

### 6.2 Multiple Invoices
- [ ] **Upload 3 Different Invoices**: Test concurrent processing
  - Expected: All invoices process correctly
  - Expected: Stats update correctly
  - Expected: All materials created without duplicates

### 6.3 Material Restock
- [ ] **Upload Same Invoice Twice**: Test duplicate detection
  - Note: Currently creates duplicates - expected behavior for testing
  - Future: May want duplicate detection

---

## 7. Error Scenarios

### 7.1 Network Issues
- [ ] **Slow Network**: Throttle network to 3G
  - Expected: Processing takes longer but completes
  - Expected: Timeout after reasonable period (> 30s)
- [ ] **Network Disconnect**: Disconnect during upload
  - Expected: Error toast appears
  - Expected: Can retry upload

### 7.2 Server Errors
- [ ] **Database Error**: (Simulated) Force database error
  - Expected: Error toast with meaningful message
  - Expected: Invoice status set to "error"
- [ ] **R2 Upload Failure**: (Simulated) Force storage error
  - Expected: Error toast appears
  - Expected: Can retry upload

---

## 8. Browser Compatibility

### 8.1 Cross-Browser Testing
- [ ] **Chrome**: Test all features
- [ ] **Firefox**: Test all features
- [ ] **Safari**: Test all features
- [ ] **Edge**: Test all features

### 8.2 Mobile Responsiveness
- [ ] **Mobile View (375px)**: Test on phone-sized screen
  - Expected: Upload area adapts
  - Expected: Table scrolls horizontally
- [ ] **Tablet View (768px)**: Test on tablet-sized screen
  - Expected: Stats cards stack
  - Expected: Table fits width

---

## 9. Performance Tests

### 9.1 Processing Speed
- [ ] **Small Invoice (1-5 items)**: Measure processing time
  - Target: < 5 seconds
  - Actual: _______ seconds
- [ ] **Medium Invoice (6-15 items)**: Measure processing time
  - Target: < 10 seconds
  - Actual: _______ seconds
- [ ] **Large Invoice (16-30 items)**: Measure processing time
  - Target: < 15 seconds
  - Actual: _______ seconds

### 9.2 File Size
- [ ] **Small File (< 1MB)**: Upload and process
  - Target: < 5 seconds
- [ ] **Large File (10-20MB)**: Upload and process
  - Target: < 20 seconds

---

## 10. Accessibility Tests

### 10.1 Keyboard Navigation
- [ ] **Tab Through Form**: Use only keyboard
  - Expected: Can navigate all inputs with Tab
  - Expected: Can activate buttons with Enter/Space
- [ ] **Screen Reader**: Test with screen reader (optional)
  - Expected: All labels read correctly
  - Expected: Error messages announced

---

## Test Results Summary

### Issues Found
| # | Issue Description | Severity | Page/Feature | Status |
|---|------------------|----------|--------------|--------|
| 1 |                  |          |              |        |
| 2 |                  |          |              |        |
| 3 |                  |          |              |        |

### Overall Assessment
- [ ] **Pass**: All critical features working
- [ ] **Pass with Minor Issues**: Working with non-critical bugs
- [ ] **Fail**: Critical issues prevent testing completion

### Notes
_Add any additional observations, edge cases, or suggestions here_

---

## Sign-off

**Tested By**: _____________________
**Date**: _____________________
**Approved**: ☐ Yes  ☐ No  ☐ With Conditions

**Conditions/Follow-up Required**:
