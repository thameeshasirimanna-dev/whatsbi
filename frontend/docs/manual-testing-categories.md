# Manual Testing Guide for Inventory Category Management

## Overview
This guide outlines manual testing procedures for the category management feature in the inventory system. All tests must be performed in a separate testing environment that mirrors production. Follow the Supabase Manual Testing Rule: no automated tests in Kilo, document all steps and results.

**Testing Environment Setup:**
1. Create a duplicate Supabase project for testing.
2. Run the migrations up to 021_add_role_to_agents.sql.
3. Create test agents: one 'admin' and one 'user'.
4. Seed test data: 5-10 inventory items, 3-5 categories.

**General Guidelines:**
- Test on desktop and mobile (responsive design).
- Verify ARIA labels, keyboard navigation, loading spinners, error messages.
- Test network failures by disconnecting internet during operations.
- Log all results in a testing log file.

## Test Cases

### 1. User Permissions
**Objective:** Verify role-based access.

**Steps:**
1. Login as 'user' role agent.
2. Navigate to Inventory page.
3. Attempt to add category: Expect permission denied error.
4. Attempt to edit category: Expect permission denied.
5. Attempt to delete category: Expect permission denied.
6. Verify can view categories and select in item forms.
7. Login as 'admin' role agent.
8. Verify can add, edit, delete categories.

**Expected Results:**
- User: View/select only, errors for CRUD.
- Admin: Full CRUD access.
- Document errors and UI feedback.

### 2. Add New Category
**Objective:** Test category creation.

**Steps:**
1. Login as admin.
2. Click "Add Category" button.
3. Fill form: valid name (alphanumeric + spaces, <50 chars), description, color (#hex).
4. Submit.
5. Verify success message, list refresh, no page reload.
6. Test invalid inputs: empty name, >50 chars, special chars, invalid color.
7. Test duplicate name.

**Expected Results:**
- Success: Category added, item_count=0, color displayed.
- Errors: Validation messages for invalid inputs/duplicates.
- UI: Loading spinner, tooltips, keyboard nav.

### 3. Display Categories
**Objective:** Test category listing.

**Steps:**
1. Login as any user.
2. Toggle "Show Categories" section.
3. Search/filter by name.
4. Verify table: name, description, item_count, color, created date, actions.
5. Test sorting (name ASC), pagination if >20.
6. Add items to categories, verify item_count updates.

**Expected Results:**
- Responsive table/cards on mobile.
- Real-time updates after CRUD.
- Empty state if no categories.

### 4. Edit Category
**Objective:** Test category updates.

**Steps:**
1. Login as admin.
2. Click Edit on a category.
3. Update name (no duplicate), description, color.
4. Submit with confirmation dialog.
5. Test preventing rename to existing.
6. Test partial updates (only color).

**Expected Results:**
- Updates propagate to item dropdowns.
- Success message, immediate UI refresh.
- Errors for validation/duplicates.
- Confirmation prevents accidents.

### 5. Delete Category
**Objective:** Test category deletion.

**Steps:**
1. Login as admin.
2. Delete empty category: Confirm dialog, success.
3. Attempt delete category with items: Expect error prompt to reassign.
4. Verify soft-delete or prevention.

**Expected Results:**
- Success for empty, error for assigned.
- List updates without reload.
- No data loss for items (category_id set NULL if soft-delete).

### 6. Integration with Item Addition/Editing
**Objective:** Test category linking.

**Steps:**
1. Add item without category: Allowed.
2. Add item with category: Dropdown populated, searchable if many.
3. Edit item: Pre-populate category, change to another.
4. If no categories: Prompt to add, disable submit.
5. Backend validation: Try invalid category_id via dev tools.

**Expected Results:**
- Mandatory if categories exist.
- Dropdown autocomplete for large lists.
- Backend prevents orphaned references.
- UI disables submit if required.

### 7. Error Handling & Edge Cases
**Steps:**
1. Network failure during CRUD: Retry, error messages.
2. Empty lists: Prompts, empty states.
3. Concurrent edits: Last wins, optimistic UI.
4. Mobile: Touch targets, responsive layout.
5. Accessibility: Screen reader announces actions, focus management.

**Expected Results:**
- Graceful errors, logging.
- All edge cases handled without crashes.

### 8. Data Persistence
**Steps:**
1. Create/edit/delete, refresh page: Data persists.
2. Check Supabase tables: Categories stored with id, name, desc, color, timestamps.
3. Items link via category_id, updates propagate.

**Expected Results:**
- ACID compliance via transactions.
- Soft-delete or prevention for categories with items.

## Post-Testing
1. Verify no data corruption.
2. Deploy to production only after all tests pass.
3. Log all results with timestamps, user roles, outcomes.

**Testing Complete When:** All cases pass, documented.