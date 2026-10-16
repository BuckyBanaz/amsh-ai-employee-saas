from backend.ai.tools.framework.base import BaseTool, ToolContext, ToolResult
from backend.ai.capabilities.operations.clinic.read_operations import ClinicReadOperations
from backend.ai.llm.client import llm_client
from backend.server.database.models.business import Business
import logging

logger = logging.getLogger(__name__)

class AnswerFaqTool(BaseTool):
    """
    Answers user FAQs regarding the clinic's services, doctors, and basic info using the LLM.
    """
    
    @property
    def name(self) -> str:
        return "answer_faq"
        
    @property
    def description(self) -> str:
        return "Answers general FAQs about the clinic's services, doctors, and working hours."
        
    async def execute(self, context: ToolContext, **kwargs) -> ToolResult:
        if not context.db or not context.user_transcript:
            return ToolResult(
                success=False, 
                message="I'm sorry, I don't have enough information to answer that right now."
            )
            
        try:
            # Gather business context
            business = context.db.get(Business, context.business_id)
            if not business:
                return ToolResult(success=False, message="I'm sorry, I cannot find the clinic information.")
                
            services = ClinicReadOperations.get_services(context.db, context.business_id)
            doctors = ClinicReadOperations.get_doctors(context.db, context.business_id)
            
            services_text = ", ".join([f"{s['title']} ({s.get('price', 'price varies')})" for s in services]) or "various treatments"
            doctors_text = ", ".join([d["name"] for d in doctors]) or "our experienced staff"

            # Retrieve top matching snippets from RAG Knowledge Base (<50ms)
            rag_snippets = []
            try:
                from backend.server.api.routes.knowledge import ensure_business_indexed
                from backend.ai.engine.rag.retriever import rag_retriever
                ensure_business_indexed(context.business_id, context.db, force_reload=False)
                rag_snippets = rag_retriever.retrieve_snippets(context.business_id, context.user_transcript, top_k=3)
            except Exception as rag_err:
                logger.warning(f"RAG lookup in answer_faq: {rag_err}")

            rag_text = "\n".join([f"- {s}" for s in rag_snippets]) if rag_snippets else "None"
            
            system_prompt = f"""
You are the AI Receptionist for {business.name}.
Answer the user's question concisely (max 2 short sentences). Do NOT offer to book an appointment unless they explicitly asked.
Here is the clinic's information to answer their question:
Services Offered: {services_text}
Doctors Available: {doctors_text}
Country: {business.country}
Timezone: {business.timezone}

Relevant Knowledge Base & Policy Snippets:
{rag_text}

If the user's question cannot be answered using this information, politely state that you can help with scheduling appointments or they can speak to the front desk.
Respond in the language the user is speaking in (Hindi, English, or Hinglish).
"""
            
            answer = await llm_client.generate_text(system_prompt, context.user_transcript)
            
            return ToolResult(
                success=True,
                message=answer,
                data={"question": context.user_transcript, "answer": answer}
            )
            
        except Exception as e:
            logger.error(f"Failed to answer FAQ: {e}")
            return ToolResult(
                success=False,
                message="I'm sorry, I'm having trouble pulling up that information right now."
            )
