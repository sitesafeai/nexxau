"""
Violation Store

In-memory store for managing violations with deduplication.

This is a pure data structure with no I/O dependencies.
In production, this would be backed by a database (PostgreSQL).
"""
from typing import Dict, Optional, List
from datetime import datetime
from .violation_model import Violation


class ViolationStore:
    """
    In-memory violation store with deduplication.
    
    Maintains one active violation per dedup key.
    Dedup key format: {camera_id}:{violation_type}:{zone_id or 'none'}
    """
    
    def __init__(self):
        # Map: dedup_key -> Violation
        self._violations: Dict[str, Violation] = {}
        
        # Map: violation_id -> dedup_key (for reverse lookup)
        self._violation_id_to_key: Dict[str, str] = {}
    
    def get_violation_by_key(self, dedup_key: str) -> Optional[Violation]:
        """
        Get violation by deduplication key.
        
        Args:
            dedup_key: Deduplication key
            
        Returns:
            Violation if found, None otherwise
        """
        return self._violations.get(dedup_key)
    
    def get_violation_by_id(self, violation_id: str) -> Optional[Violation]:
        """
        Get violation by violation_id.
        
        Args:
            violation_id: Violation UUID
            
        Returns:
            Violation if found, None otherwise
        """
        dedup_key = self._violation_id_to_key.get(violation_id)
        if dedup_key:
            return self._violations.get(dedup_key)
        return None
    
    def upsert_violation(self, violation: Violation) -> Violation:
        """
        Insert or update violation.
        
        If violation with same dedup_key exists, replaces it.
        Maintains deduplication guarantee: only one violation per dedup key.
        
        Args:
            violation: Violation instance to store
            
        Returns:
            Stored violation instance
        """
        dedup_key = violation.get_dedup_key()
        
        # Remove old violation_id mapping if exists
        old_violation = self._violations.get(dedup_key)
        if old_violation and old_violation.violation_id != violation.violation_id:
            del self._violation_id_to_key[old_violation.violation_id]
        
        # Store new violation
        self._violations[dedup_key] = violation
        self._violation_id_to_key[violation.violation_id] = dedup_key
        
        return violation
    
    def remove_violation(self, violation: Violation) -> bool:
        """
        Remove violation from store.
        
        Args:
            violation: Violation to remove
            
        Returns:
            True if removed, False if not found
        """
        dedup_key = violation.get_dedup_key()
        if dedup_key in self._violations:
            del self._violations[dedup_key]
            if violation.violation_id in self._violation_id_to_key:
                del self._violation_id_to_key[violation.violation_id]
            return True
        return False
    
    def get_all_violations(self) -> List[Violation]:
        """
        Get all violations in store.
        
        Returns:
            List of all violations
        """
        return list(self._violations.values())
    
    def get_active_violations(self) -> List[Violation]:
        """
        Get all active violations (ACTIVE or ESCALATED state).
        
        Returns:
            List of active violations
        """
        from .violation_model import ViolationState
        return [
            v for v in self._violations.values()
            if v.state in [ViolationState.ACTIVE, ViolationState.ESCALATED]
        ]
    
    def get_violations_by_state(self, state) -> List[Violation]:
        """
        Get violations by state.
        
        Args:
            state: ViolationState enum value
            
        Returns:
            List of violations with specified state
        """
        return [v for v in self._violations.values() if v.state == state]
    
    def clear(self) -> None:
        """Clear all violations from store (for testing)"""
        self._violations.clear()
        self._violation_id_to_key.clear()
    
    def size(self) -> int:
        """Get total number of violations in store"""
        return len(self._violations)

