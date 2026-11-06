from django.db import models

# Criando Meus models

class Produto(models.Model):
    name = models.CharField(max_length=155)
    descripition = models.CharField(max_length=155)