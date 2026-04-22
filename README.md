# CrudHibridoMongo: MongoDB Replica Set en Docker

Este entorno ha sido diseñado para automatizar la configuración del taller de replicación y asegurar la alta disponibilidad. Aquí se detallan los comandos y conceptos clave para la ejecución del proyecto.

## Ejecucion del Proyecto

### 1. Levantar el entorno completo
Para iniciar los 3 nodos de datos, el árbitro y la aplicación de Node.js de forma automática, ejecutar:
```bash
docker-compose up -d
```

### 2. Verificar la conexión de la App
Para confirmar que el servidor ha establecido conexión con el clúster, revisar los logs:
```bash
docker logs -f node_app
```
*Si la conexión es exitosa se mostrará: "Conexión establecida al mongo (Replica Set - Puertos Finales)"*

---

## Comandos de Verificacion (Sustentacion)

### Ver el estado del clúster (rs.status)
Este comando se ejecuta desde dentro de Docker, por lo que funciona sin necesidad de permisos de administrador en la PC:
```bash
# Si el nodo 1 está activo:
docker exec nodo1 mongosh --port 27017 --eval "rs.status()"

# Si el nodo 1 está apagado, consultar al nodo 2:
docker exec nodo2 mongosh --port 27018 --eval "rs.status()"
```

### Validar la replicación de datos
Para demostrar que los datos se encuentran sincronizados en todos los nodos:
```bash
# Ver usuarios registrados en el Nodo 2:
docker exec nodo2 mongosh --port 27018 --eval "db.getSiblingDB('prueba').usuarios.find()"
```

---

## Configuracion de Conexion en Compass

### Caso A: Con archivo `hosts` editado
Utilizar la cadena de conexión completa:
`mongodb://nodo1:27017,nodo2:27018,nodo3:27019/?replicaSet=RP`

### Caso B: Sin acceso a `hosts` (Plan B)
Si no es posible editar el archivo hosts, realizar la conexión manual a cada nodo usando **Direct Connection**:
- Nodo 1: `mongodb://localhost:27017/?directConnection=true`
- Nodo 2: `mongodb://localhost:27018/?directConnection=true`
- Nodo 3: `mongodb://localhost:27019/?directConnection=true`

---

## Conceptos Teoricos

1.  **Quórum**: El clúster cuenta con 4 miembros votantes, por lo que la mayoría requerida es de **3 nodos**. Si se apagan 2 nodos, el sistema entra en modo de solo lectura por seguridad.
2.  **Árbitro**: El contenedor `arb` actúa como juez para desempatar las elecciones cuando un nodo falla, no almacena datos.
3.  **Prioridad**: El `nodo1` cuenta con una prioridad más alta (`priority: 2`) para ser elegido como líder preferente cuando se encuentra activo.
4.  **Failover**: El sistema detecta automáticamente la caída de un nodo y realiza la elección de un nuevo líder en pocos segundos para garantizar la continuidad del servicio.

---

## Finalizacion y Limpieza
Al terminar la sustentación, se puede detener y eliminar todo el entorno con:
```bash
docker-compose down
```
