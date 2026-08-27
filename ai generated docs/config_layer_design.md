# Vertical Configuration Schema Guide

To maintain a vertical-agnostic core engine, all business types are defined using a configuration file.

## Configuration Structure

A vertical configuration (e.g., `clinic_config.yaml` or `restaurant_config.yaml`) must define the following key areas:

### 1. Terminology Mapping
Maps generic platform entities to business-specific terms for the Frontend UI.
*   `Customer` -> `Patient` (Clinic) / `Diner` (Restaurant)
*   `Service` -> `Treatment` (Clinic) / `Menu Item` (Restaurant)

### 2. Expected Intents
Defines the conversational intents the state machine should handle for this vertical.
*   e.g., `book_appointment`, `cancel_appointment`, `query_hours`.

### 3. Required Extraction Fields
Fields that the LLM must extract to fulfill specific intents.
*   e.g., `date`, `time`, `symptoms`, `patient_name`.

### 4. Tool Bindings
Functions the AI is allowed to call for this vertical.
*   e.g., `check_calendar_availability`, `create_booking`.

### 5. Prompt Templates
The base system prompts that instruct the LLM on its persona and tone.

## Example Concept
```yaml
name: "Healthcare Clinic"
capabilities:
  - appointments
  - emergency_triage
terminology:
  customer: "Patient"
  agent: "Receptionist"
```
