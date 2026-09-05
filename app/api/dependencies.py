from typing import Annotated

from fastapi import Query


Page = Annotated[int, Query(ge=1, description="Número da página")]
PageSize = Annotated[int, Query(ge=1, le=100, description="Itens por página")]
