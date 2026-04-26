from pydantic import BaseModel, Field
from typing import Optional

class GenerateScreenplayRequest(BaseModel):
    idea: str = Field(..., min_length=2, max_length=500, description="The core logline or idea for the short film.")
    tone: str = Field(default="Standard", max_length=50)
    intensity: int = Field(default=50, ge=1, le=100)
    length: str = Field(default="Medium", max_length=20)
    seed: Optional[float] = Field(default=0)

class GenerateMetadataRequest(BaseModel):
    script: str = Field(..., min_length=10, description="The master screenplay text.")

class GenerateComponentsRequest(BaseModel):
    project_id: Optional[int] = Field(default=None)
    idea: str = Field(..., min_length=2, max_length=500)
    script: str = Field(..., min_length=10)
    tone: str = Field(default="Standard")
    intensity: int = Field(default=50, ge=1, le=100)
    metadata: dict = Field(default_factory=dict)
