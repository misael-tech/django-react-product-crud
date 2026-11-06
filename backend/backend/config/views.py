from django.shortcuts import render
from .models import Produto
from .serializers import ProdutoSerializer
from rest_framework import permissions,viewsets

# Create your views here.

class ProdutoViewSet(viewsets.ModelViewSet):
    
    queryset = Produto.objects.all()
    serializer_class = ProdutoSerializer
    permission_classes = [permissions.IsAuthenticated]
