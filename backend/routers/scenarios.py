"""
シナリオ一覧・取得
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException
from models.lab_models import Scenario

router = APIRouter()

# [将来実装] YAML/DB からロード
_scenarios: dict[UUID, Scenario] = {}


@router.get("/", response_model=list[Scenario])
async def list_scenarios():
    return list(_scenarios.values())


@router.get("/{scenario_id}", response_model=Scenario)
async def get_scenario(scenario_id: UUID):
    s = _scenarios.get(scenario_id)
    if not s:
        raise HTTPException(404, "Scenario not found")
    return s
