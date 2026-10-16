"""
Server Omnichannel Notifications Hub.
Provides SMS, WhatsApp, Email, and live dashboard push alerts.
"""

from backend.server.notifications.dispatcher import NotificationDispatcher

__all__ = ["NotificationDispatcher"]
