from pydantic import BaseModel


class StatusUpdate(BaseModel):
    ativo: bool
