"""
Pydantic schemas for the AMSh Vertical Configuration Layer.
Enforces that every vertical config (YAML/JSON) is strictly structured,
completely dynamic, and decoupled from core engine code.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SlotDefinition(BaseModel):
    """A required or optional entity to extract for an intent."""
    name: str
    type: str = "string"  # string, date, time, number, boolean
    description: str
    required: bool = True
    prompt: Optional[str] = None  # Question to ask if this slot is missing
    validation_regex: Optional[str] = None
    allowed_values: Optional[List[str]] = None


class IntentDefinition(BaseModel):
    """An intent supported by this vertical."""
    name: str
    description: str
    slots: List[SlotDefinition] = Field(default_factory=list)
    target_tool: Optional[str] = None  # Tool name to trigger once all required slots are filled
    confirmation_required: bool = True


class TerminologyConfig(BaseModel):
    """Vertical-specific vocabulary mappings (e.g. Customer -> Patient)."""
    customer_label: str = "Customer"
    provider_label: str = "Staff"
    booking_label: str = "Appointment"
    catalog_label: str = "Services"


class EscalationRule(BaseModel):
    """Keywords or conditions triggering immediate human transfer."""
    trigger_keywords: List[str] = Field(default_factory=list)
    action: str = "transfer"  # transfer, hangup, flag
    target_role: Optional[str] = None  # e.g. "doctor", "front_desk"
    message: str = "Transferring you to a specialist now."


class VerticalConfig(BaseModel):
    """Complete specification of a business vertical."""
    name: str
    version: str = "1.0.0"
    display_name: str
    description: str
    terminology: TerminologyConfig = Field(default_factory=TerminologyConfig)
    intents: List[IntentDefinition] = Field(default_factory=list)
    escalation_rules: List[EscalationRule] = Field(default_factory=list)
    system_prompt_template: str
    greeting_template: str = "Hello, thanks for calling {business_name}. How can I assist you today?"
    default_tools: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
