
from django.urls import path,include
from rest_framework import routers

#Tem que importar as viwes
from config import views

#
router = routers.DefaultRouter()

router.register(r"produtos",views.ProdutoViewSet)



urlpatterns = [
    path("", include(router.urls)),
    path("api/",include("rest_framework.urls"))

]
