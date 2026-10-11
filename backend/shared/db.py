"""
DynamoDB Database Abstraction for Baadh Bol:
Provides unified repository for Areas, Residents, Alerts, and Calls.
Supports boto3 DynamoDB tables in AWS, as well as an in-memory test store for local testing.
"""

import logging
from typing import List, Optional, Dict, Any
from .models import Area, Resident, Alert, Call, current_iso_time
from .config import Config

logger = logging.getLogger(__name__)

class DatabaseRepository:
    def __init__(self, dynamodb_resource=None, in_memory: bool = False):
        self.dynamodb = dynamodb_resource
        self.in_memory = in_memory or (dynamodb_resource is None)

        # In-memory stores for testing / local development
        self._mem_areas: Dict[str, Dict[str, Any]] = {}
        self._mem_residents: Dict[str, Dict[str, Any]] = {}
        self._mem_alerts: Dict[str, Dict[str, Any]] = {}
        self._mem_calls: Dict[str, Dict[str, Any]] = {}

    # ----------------- AREAS -----------------
    def save_area(self, area: Area) -> Area:
        area.updated_at = current_iso_time()
        data = area.to_dict()
        if self.in_memory or not self.dynamodb:
            self._mem_areas[area.area_id] = data
            return area

        try:
            table = self.dynamodb.Table(Config.AREAS_TABLE)
            table.put_item(Item=data)
            return area
        except Exception as e:
            logger.error(f"Error saving area {area.area_id}: {e}")
            self._mem_areas[area.area_id] = data
            return area

    def get_area(self, area_id: str) -> Optional[Area]:
        if self.in_memory or not self.dynamodb:
            data = self._mem_areas.get(area_id)
            return Area.from_dict(data) if data else None

        try:
            table = self.dynamodb.Table(Config.AREAS_TABLE)
            res = table.get_item(Key={"areaId": area_id})
            item = res.get("Item")
            return Area.from_dict(item) if item else None
        except Exception as e:
            logger.error(f"Error getting area {area_id}: {e}")
            data = self._mem_areas.get(area_id)
            return Area.from_dict(data) if data else None

    def list_areas(self) -> List[Area]:
        if self.in_memory or not self.dynamodb:
            return [Area.from_dict(d) for d in self._mem_areas.values()]

        try:
            table = self.dynamodb.Table(Config.AREAS_TABLE)
            res = table.scan()
            items = res.get("Items", [])
            return [Area.from_dict(item) for item in items]
        except Exception as e:
            logger.error(f"Error listing areas: {e}")
            return [Area.from_dict(d) for d in self._mem_areas.values()]

    def update_river_level(self, area_id: str, river_level: float) -> Optional[Area]:
        area = self.get_area(area_id)
        if not area:
            return None
        area.river_level = float(river_level)
        return self.save_area(area)

    # ----------------- RESIDENTS -----------------
    def save_resident(self, resident: Resident) -> Resident:
        data = resident.to_db_dict()
        if self.in_memory or not self.dynamodb:
            self._mem_residents[resident.resident_id] = data
            return resident

        try:
            table = self.dynamodb.Table(Config.RESIDENTS_TABLE)
            table.put_item(Item=data)
            return resident
        except Exception as e:
            logger.error(f"Error saving resident {resident.resident_id}: {e}")
            self._mem_residents[resident.resident_id] = data
            return resident

    def get_resident(self, resident_id: str) -> Optional[Resident]:
        if self.in_memory or not self.dynamodb:
            data = self._mem_residents.get(resident_id)
            return Resident.from_dict(data) if data else None

        try:
            table = self.dynamodb.Table(Config.RESIDENTS_TABLE)
            res = table.get_item(Key={"residentId": resident_id})
            item = res.get("Item")
            return Resident.from_dict(item) if item else None
        except Exception as e:
            logger.error(f"Error getting resident {resident_id}: {e}")
            data = self._mem_residents.get(resident_id)
            return Resident.from_dict(data) if data else None

    def list_residents(self, area_id: Optional[str] = None, mask_phone: bool = True) -> List[Dict[str, Any]]:
        residents: List[Resident] = []
        if self.in_memory or not self.dynamodb:
            raw_list = list(self._mem_residents.values())
            if area_id:
                raw_list = [r for r in raw_list if r.get("areaId") == area_id]
            residents = [Resident.from_dict(r) for r in raw_list]
        else:
            try:
                table = self.dynamodb.Table(Config.RESIDENTS_TABLE)
                if area_id:
                    # Query via GSI
                    res = table.query(
                        IndexName="AreaIndex",
                        KeyConditionExpression="areaId = :aid",
                        ExpressionAttributeValues={":aid": area_id}
                    )
                    items = res.get("Items", [])
                else:
                    items = table.scan().get("Items", [])
                residents = [Resident.from_dict(item) for item in items]
            except Exception as e:
                logger.error(f"Error listing residents: {e}")
                raw_list = list(self._mem_residents.values())
                if area_id:
                    raw_list = [r for r in raw_list if r.get("areaId") == area_id]
                residents = [Resident.from_dict(r) for r in raw_list]

        return [r.to_dict(mask_phone=mask_phone) for r in residents]

    def get_active_residents_for_calling(self, area_id: str) -> List[Resident]:
        """Returns consenting, non-opted-out residents with unmasked numbers for alerting."""
        all_res = self.list_residents(area_id=area_id, mask_phone=False)
        return [
            Resident.from_dict(r)
            for r in all_res
            if r.get("consent", True) and not r.get("optedOut", False)
        ]

    def delete_resident(self, resident_id: str) -> bool:
        if self.in_memory or not self.dynamodb:
            if resident_id in self._mem_residents:
                del self._mem_residents[resident_id]
                return True
            return False

        try:
            table = self.dynamodb.Table(Config.RESIDENTS_TABLE)
            table.delete_item(Key={"residentId": resident_id})
            return True
        except Exception as e:
            logger.error(f"Error deleting resident {resident_id}: {e}")
            return False

    def update_opt_out(self, resident_id: str, opted_out: bool = True) -> bool:
        res = self.get_resident(resident_id)
        if not res:
            return False
        res.opted_out = opted_out
        self.save_resident(res)
        return True

    # ----------------- ALERTS -----------------
    def save_alert(self, alert: Alert) -> Alert:
        data = alert.to_dict()
        if self.in_memory or not self.dynamodb:
            self._mem_alerts[alert.alert_id] = data
            return alert

        try:
            table = self.dynamodb.Table(Config.ALERTS_TABLE)
            table.put_item(Item=data)
            return alert
        except Exception as e:
            logger.error(f"Error saving alert {alert.alert_id}: {e}")
            self._mem_alerts[alert.alert_id] = data
            return alert

    def get_alert(self, alert_id: str) -> Optional[Alert]:
        if self.in_memory or not self.dynamodb:
            data = self._mem_alerts.get(alert_id)
            return Alert.from_dict(data) if data else None

        try:
            table = self.dynamodb.Table(Config.ALERTS_TABLE)
            res = table.get_item(Key={"alertId": alert_id})
            item = res.get("Item")
            return Alert.from_dict(item) if item else None
        except Exception as e:
            logger.error(f"Error getting alert {alert_id}: {e}")
            data = self._mem_alerts.get(alert_id)
            return Alert.from_dict(data) if data else None

    def list_alerts(self, limit: int = 50, area_id: Optional[str] = None) -> List[Alert]:
        if self.in_memory or not self.dynamodb:
            alerts = list(self._mem_alerts.values())
            if area_id:
                alerts = [a for a in alerts if a.get("areaId") == area_id]
            # Sort newest first
            alerts.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return [Alert.from_dict(a) for a in alerts[:limit]]

        try:
            table = self.dynamodb.Table(Config.ALERTS_TABLE)
            if area_id:
                res = table.query(
                    IndexName="AreaAlertsIndex",
                    KeyConditionExpression="areaId = :aid",
                    ExpressionAttributeValues={":aid": area_id},
                    ScanIndexForward=False,
                    Limit=limit
                )
                items = res.get("Items", [])
            else:
                res = table.scan(Limit=limit)
                items = res.get("Items", [])
                items.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return [Alert.from_dict(item) for item in items]
        except Exception as e:
            logger.error(f"Error listing alerts: {e}")
            alerts = list(self._mem_alerts.values())
            if area_id:
                alerts = [a for a in alerts if a.get("areaId") == area_id]
            alerts.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return [Alert.from_dict(a) for a in alerts[:limit]]

    # ----------------- CALLS -----------------
    def save_call(self, call: Call) -> Call:
        call.updated_at = current_iso_time()
        data = call.to_dict()
        if self.in_memory or not self.dynamodb:
            self._mem_calls[call.call_id] = data
            return call

        try:
            table = self.dynamodb.Table(Config.CALLS_TABLE)
            table.put_item(Item=data)
            return call
        except Exception as e:
            logger.error(f"Error saving call {call.call_id}: {e}")
            self._mem_calls[call.call_id] = data
            return call

    def get_call(self, call_id: str) -> Optional[Call]:
        if self.in_memory or not self.dynamodb:
            data = self._mem_calls.get(call_id)
            return Call.from_dict(data) if data else None

        try:
            table = self.dynamodb.Table(Config.CALLS_TABLE)
            res = table.get_item(Key={"callId": call_id})
            item = res.get("Item")
            return Call.from_dict(item) if item else None
        except Exception as e:
            logger.error(f"Error getting call {call_id}: {e}")
            data = self._mem_calls.get(call_id)
            return Call.from_dict(data) if data else None

    def list_calls_by_alert(self, alert_id: str) -> List[Call]:
        if self.in_memory or not self.dynamodb:
            calls = [c for c in self._mem_calls.values() if c.get("alertId") == alert_id]
            calls.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return [Call.from_dict(c) for c in calls]

        try:
            table = self.dynamodb.Table(Config.CALLS_TABLE)
            res = table.query(
                IndexName="AlertCallsIndex",
                KeyConditionExpression="alertId = :aid",
                ExpressionAttributeValues={":aid": alert_id},
                ScanIndexForward=False
            )
            items = res.get("Items", [])
            return [Call.from_dict(item) for item in items]
        except Exception as e:
            logger.error(f"Error listing calls for alert {alert_id}: {e}")
            calls = [c for c in self._mem_calls.values() if c.get("alertId") == alert_id]
            calls.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
            return [Call.from_dict(c) for c in calls]

    def update_call_status(
        self,
        call_id: str,
        status: str,
        key_pressed: Optional[str] = None
    ) -> Optional[Call]:
        call = self.get_call(call_id)
        if not call:
            return None
        call.status = status
        if key_pressed is not None:
            call.key_pressed = key_pressed
        call.updated_at = current_iso_time()
        return self.save_call(call)
