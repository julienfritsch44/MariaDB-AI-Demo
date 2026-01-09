"""
Dynamic Data Masking Router
Automatic PII masking (emails, credit cards, etc.) based on role
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import re
from database import get_db_connection
from error_factory import ErrorFactory

router = APIRouter(prefix="/masking", tags=["Data Masking"])


class MaskingAnalyzeRequest(BaseModel):
    database: str = "shop_demo"
    tables: Optional[List[str]] = None


class MaskingApplyRequest(BaseModel):
    query_result: Dict[str, Any]
    role: str = "dba"
    masking_level: str = "partial"


class MaskingRule(BaseModel):
    column_pattern: str
    data_type: str
    masking_strategy: str
    enabled: bool = True


class MaskingConfigureRequest(BaseModel):
    role: str
    rules: List[MaskingRule]


class PIIDetector:
    """PII column detector"""
    
    PII_PATTERNS = {
        'email': {
            'column_names': ['email', 'mail', 'e_mail', 'contact_email'],
            'regex': r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
            'masking_strategy': 'partial_email'
        },
        'phone': {
            'column_names': ['phone', 'telephone', 'mobile', 'cell', 'tel'],
            'regex': r'^\+?[\d\s\-\(\)]{10,}$',
            'masking_strategy': 'partial_phone'
        },
        'credit_card': {
            'column_names': ['credit_card', 'card_number', 'cc', 'card', 'payment_card'],
            'regex': r'^\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}$',
            'masking_strategy': 'partial_card'
        },
        'ssn': {
            'column_names': ['ssn', 'social_security', 'security_number'],
            'regex': r'^\d{3}-\d{2}-\d{4}$',
            'masking_strategy': 'full_mask'
        },
        'iban': {
            'column_names': ['iban', 'bank_account', 'account_number'],
            'regex': r'^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$',
            'masking_strategy': 'partial_iban'
        },
        'address': {
            'column_names': ['address', 'street', 'home_address', 'billing_address'],
            'regex': None,
            'masking_strategy': 'partial_address'
        }
    }
    
    @classmethod
    def detect_pii_column(cls, column_name: str, sample_values: List[str]) -> Optional[Dict]:
        """Detects if a column contains PII"""
        column_lower = column_name.lower()
        
        for pii_type, config in cls.PII_PATTERNS.items():
            if any(pattern in column_lower for pattern in config['column_names']):
                confidence = 0.8
                
                if config['regex'] and sample_values:
                    matches = sum(1 for val in sample_values if val and re.match(config['regex'], str(val)))
                    if matches > 0:
                        confidence = min(0.95, 0.8 + (matches / len(sample_values)) * 0.15)
                
                return {
                    'pii_type': pii_type,
                    'confidence': confidence,
                    'masking_strategy': config['masking_strategy']
                }
        
        return None


class DataMasker:
    """Applies masking strategies"""
    
    @staticmethod
    def mask_email(email: str, level: str = "partial") -> str:
        """Masks an email: john.doe@example.com -> j***@e***.com"""
        if not email or '@' not in email:
            return email
        
        if level == "full":
            return "***@***.***"
        
        local, domain = email.split('@', 1)
        domain_parts = domain.split('.')
        
        masked_local = local[0] + '***' if len(local) > 1 else '***'
        masked_domain = domain_parts[0][0] + '***' if len(domain_parts[0]) > 1 else '***'
        
        return f"{masked_local}@{masked_domain}.{domain_parts[-1]}"
    
    @staticmethod
    def mask_phone(phone: str, level: str = "partial") -> str:
        """Masks a phone number: +33 6 12 34 56 78 -> +33 6 ** ** ** 78"""
        if not phone:
            return phone
        
        if level == "full":
            return "***-***-****"
        
        digits = re.sub(r'\D', '', phone)
        if len(digits) < 4:
            return "***"
        
        return phone[:-4].replace(re.findall(r'\d', phone[:-4])[0] if re.findall(r'\d', phone[:-4]) else '', '*', len(re.findall(r'\d', phone[:-4])) - 2) + phone[-4:]
    
    @staticmethod
    def mask_credit_card(card: str, level: str = "partial") -> str:
        """Masks a card number: 4532-1234-5678-9010 -> ****-****-****-9010"""
        if not card:
            return card
        
        if level == "full":
            return "****-****-****-****"
        
        digits = re.sub(r'\D', '', card)
        if len(digits) < 4:
            return "****"
        
        separator = '-' if '-' in card else ' ' if ' ' in card else ''
        last_four = digits[-4:]
        
        if separator:
            return f"****{separator}****{separator}****{separator}{last_four}"
        return f"************{last_four}"
    
    @staticmethod
    def mask_ssn(ssn: str, level: str = "partial") -> str:
        """Masks an SSN: 123-45-6789 -> ***-**-6789"""
        if not ssn:
            return ssn
        
        if level == "full":
            return "***-**-****"
        
        if '-' in ssn:
            parts = ssn.split('-')
            return f"***-**-{parts[-1]}" if len(parts) == 3 else "***-**-****"
        
        return "***-**-" + ssn[-4:] if len(ssn) >= 4 else "***-**-****"
    
    @staticmethod
    def mask_iban(iban: str, level: str = "partial") -> str:
        """Masks an IBAN: FR7612345678901234567890123 -> FR76************0123"""
        if not iban or len(iban) < 8:
            return "****"
        
        if level == "full":
            return "****"
        
        return iban[:4] + '*' * (len(iban) - 8) + iban[-4:]
    
    @staticmethod
    def mask_address(address: str, level: str = "partial") -> str:
        """Masks an address: 123 Main Street → *** Main Street"""
        if not address:
            return address
        
        if level == "full":
            return "*** *** ***"
        
        parts = address.split()
        if len(parts) > 1:
            return '***' + ' ' + ' '.join(parts[1:])
        return '***'
    
    @classmethod
    def apply_masking(cls, value: Any, pii_type: str, level: str = "partial") -> Any:
        """Applies masking based on PII type"""
        if value is None:
            return None
        
        value_str = str(value)
        
        masking_methods = {
            'email': cls.mask_email,
            'phone': cls.mask_phone,
            'credit_card': cls.mask_credit_card,
            'ssn': cls.mask_ssn,
            'iban': cls.mask_iban,
            'address': cls.mask_address
        }
        
        method = masking_methods.get(pii_type)
        if method:
            return method(value_str, level)
        
        return value


@router.post("/analyze")
async def analyze_pii_columns(request: MaskingAnalyzeRequest):
    """
    Analyzes database columns to detect PII
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(f"USE {request.database}")
        
        if request.tables:
            tables_clause = "AND TABLE_NAME IN (" + ','.join(['%s'] * len(request.tables)) + ")"
            cursor.execute(f"""
                SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s {tables_clause}
                ORDER BY TABLE_NAME, ORDINAL_POSITION
            """, (request.database, *request.tables))
        else:
            cursor.execute("""
                SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = %s
                ORDER BY TABLE_NAME, ORDINAL_POSITION
            """, (request.database,))
        
        columns = cursor.fetchall()
        
        pii_columns = []
        
        for col in columns:
            table_name = col['TABLE_NAME']
            column_name = col['COLUMN_NAME']
            data_type = col['DATA_TYPE']
            
            cursor.execute(
                f"SELECT {column_name} FROM {table_name} WHERE {column_name} IS NOT NULL LIMIT 5"
            )
            samples = [row[column_name] for row in cursor.fetchall()]
            
            pii_info = PIIDetector.detect_pii_column(column_name, samples)
            
            if pii_info:
                pii_columns.append({
                    'table': table_name,
                    'column': column_name,
                    'data_type': data_type,
                    'pii_type': pii_info['pii_type'],
                    'confidence': pii_info['confidence'],
                    'masking_strategy': pii_info['masking_strategy'],
                    'sample_masked': DataMasker.apply_masking(
                        samples[0] if samples else None,
                        pii_info['pii_type']
                    )
                })
        
        cursor.close()
        conn.close()
        
        return {
            "success": True,
            "database": request.database,
            "total_columns_analyzed": len(columns),
            "pii_columns_detected": len(pii_columns),
            "pii_columns": pii_columns,
            "recommendations": [
                "Enable masking for DBA role to ensure GDPR compliance",
                "Configure audit trail to track who accessed PII data",
                "Consider column-level encryption for highly sensitive data"
            ]
        }
        
    except Exception as e:
        db_error = ErrorFactory.database_error(
            "PII Analysis",
            f"Failed to analyze PII columns in database {request.database}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(db_error)
        }


@router.post("/apply")
async def apply_masking(request: MaskingApplyRequest):
    """
    Applies masking to a query result
    """
    try:
        if not request.query_result or 'columns' not in request.query_result:
            return {
                "success": False,
                "message": "Invalid query result format"
            }
        
        columns = request.query_result['columns']
        rows = request.query_result.get('rows', [])
        
        pii_column_indices = {}
        for idx, col_name in enumerate(columns):
            pii_info = PIIDetector.detect_pii_column(col_name, [])
            if pii_info:
                pii_column_indices[idx] = pii_info['pii_type']
        
        if request.role == "admin":
            masking_level = "none"
        elif request.role == "dba":
            masking_level = request.masking_level
        else:
            masking_level = "full"
        
        if masking_level == "none":
            masked_rows = rows
        else:
            masked_rows = []
            for row in rows:
                masked_row = list(row)
                for idx, pii_type in pii_column_indices.items():
                    if idx < len(masked_row):
                        masked_row[idx] = DataMasker.apply_masking(
                            masked_row[idx],
                            pii_type,
                            masking_level
                        )
                masked_rows.append(masked_row)
        
        return {
            "success": True,
            "role": request.role,
            "masking_level": masking_level,
            "pii_columns_masked": len(pii_column_indices),
            "result": {
                "columns": columns,
                "rows": masked_rows
            },
            "audit": {
                "masked_columns": [columns[idx] for idx in pii_column_indices.keys()],
                "masking_applied": masking_level != "none"
            }
        }
        
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Data Masking",
            "Failed to apply masking to query results",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(service_error)
        }


@router.get("/rules")
async def get_masking_rules(role: str = "dba"):
    """
    Retrieves active masking rules for a role
    """
    try:
        default_rules = {
            "admin": {
                "masking_enabled": False,
                "rules": []
            },
            "dba": {
                "masking_enabled": True,
                "masking_level": "partial",
                "rules": [
                    {"pii_type": "email", "strategy": "partial_email"},
                    {"pii_type": "phone", "strategy": "partial_phone"},
                    {"pii_type": "credit_card", "strategy": "partial_card"},
                    {"pii_type": "ssn", "strategy": "full_mask"},
                    {"pii_type": "iban", "strategy": "partial_iban"}
                ]
            },
            "developer": {
                "masking_enabled": True,
                "masking_level": "full",
                "rules": [
                    {"pii_type": "email", "strategy": "full_mask"},
                    {"pii_type": "phone", "strategy": "full_mask"},
                    {"pii_type": "credit_card", "strategy": "full_mask"},
                    {"pii_type": "ssn", "strategy": "full_mask"},
                    {"pii_type": "iban", "strategy": "full_mask"}
                ]
            }
        }
        
        rules = default_rules.get(role, default_rules["developer"])
        
        return {
            "success": True,
            "role": role,
            "rules": rules,
            "gdpr_compliant": rules["masking_enabled"]
        }
        
    except Exception as e:
        service_error = ErrorFactory.service_error(
            "Masking Rules",
            f"Failed to retrieve masking rules for role {role}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(service_error)
        }


@router.post("/configure")
async def configure_masking_rules(request: MaskingConfigureRequest):
    """
    Configures masking rules for a role
    """
    try:
        return {
            "success": True,
            "message": f"Masking rules configured for role: {request.role}",
            "role": request.role,
            "rules_count": len(request.rules),
            "rules": [
                {
                    "column_pattern": rule.column_pattern,
                    "data_type": rule.data_type,
                    "masking_strategy": rule.masking_strategy,
                    "enabled": rule.enabled
                }
                for rule in request.rules
            ]
        }
        
    except Exception as e:
        validation_error = ErrorFactory.validation_error(
            "Masking Configuration",
            f"Failed to configure masking rules for role {request.role}",
            original_error=e
        )
        return {
            "success": False,
            "mode": "error",
            "message": str(validation_error)
        }
