from fastapi import APIRouter

from tldrastro_api.models import (
    CompositeRequest,
    CompositeResponse,
    RelationshipCompareRequest,
    RelationshipCompareResponse,
    SynastryRequest,
    SynastryResponse,
)
from tldrastro_api.services.composite import calculate_composite
from tldrastro_api.services.relationship_compare import calculate_relationship_compare
from tldrastro_api.services.synastry import calculate_synastry

router = APIRouter(prefix="/relationship", tags=["relationship"])


@router.post("/synastry", response_model=SynastryResponse)
def synastry(request: SynastryRequest):
    return calculate_synastry(request)


@router.post("/composite", response_model=CompositeResponse)
def composite(request: CompositeRequest):
    return calculate_composite(request)


@router.post("/compare", response_model=RelationshipCompareResponse)
def compare(request: RelationshipCompareRequest):
    return calculate_relationship_compare(request)
