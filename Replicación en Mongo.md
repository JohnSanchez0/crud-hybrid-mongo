

**Taller de replicación en Mongo DB**

La replicación en MongoDB es una característica fundamental que permite la alta disponibilidad y tolerancia a fallos mediante la duplicación de datos en múltiples nodos. Un conjunto de réplicas (replica set) está compuesto por varios servidores MongoDB que mantienen copias sincronizadas de los mismos datos. En caso de una falla en el nodo primario, el sistema puede promover automáticamente uno de los nodos secundarios para garantizar la continuidad del servicio sin pérdida de datos.

Este taller tiene como propósito guiar paso a paso la configuración de un conjunto de réplicas en MongoDB, comprendiendo su funcionamiento, validando la replicación de datos entre nodos, y simulando situaciones como la caída del nodo primario para observar la recuperación automática del sistema.

**Objetivo:**

Configurar un conjunto de réplicas en MongoDB utilizando múltiples nodos y un árbitro, validar la replicación de datos entre los nodos, y comprobar el proceso de elección automática de un nuevo nodo primario ante la caída del nodo principal.

![What Is Replication In MongoDB? | MongoDB][image1]

**1\. Preparación del entorno**

* Crear una carpeta local llamada data y dentro de ella, crear cuatro subcarpetas:

  * c:/data/nodo1

  * c:/data/nodo2

  * c:/data/nodo3

  * c:/data/arb

**2\. Configuración de los nodos**

Editar el archivo de configuración mongod.cfg para cada instancia. Cambiar o verificar estas propiedades:

replication:

  replSetName: RP

net:

  bindIp: 127.0.0.1

  port: \<puerto\>

storage:

  dbPath: \<ruta a la carpeta del nodo\>

Guardar una copia distinta para cada nodo.

**3\. Iniciar las instancias**

Desde la terminal (CMD o PowerShell), ejecutar:

mongod \--config "ruta/a/mongod.cfg" 

Ejemplo directo sin archivo de configuración:

mongod \--replSet RP \--dbpath="c:/data/nodo1" \--port 27017

mongod \--replSet RP \--dbpath="c:/data/nodo2" \--port 27018

mongod \--replSet RP \--dbpath="c:/data/nodo3" \--port 27019

mongod \--replSet RP \--dbpath="c:/data/arb"   \--port 27020

**4\. Inicializar el conjunto de réplicas**

Conectar al nodo principal:

mongo \--port 27017

Inicializar el conjunto:

rs.initiate({

  \_id: "RP",

  members: \[

    { \_id: 0, host: "localhost:27017", priority: 2 },

    { \_id: 1, host: "localhost:27018", priority: 1 },

    { \_id: 2, host: "localhost:27019", priority: 1 },

    { \_id: 3, host: "localhost:27020", arbiterOnly: true }

  \]

});

**5\. Verificación de configuración y estado**

rs.status()

rs.conf()

db.isMaster()

Para cambiar la prioridad de un nodo:

let config \= rs.conf();

config.members\[0\].priority \= 3;

rs.reconfig(config);

**6\. Crear una base de datos y probar replicación**

use prueba

db.usuarios.insertMany(\[

  { nombre: "Carlos" },

  { nombre: "María" },

  { nombre: "Pedro" }

\]);

db.usuarios.find()

**7\. Ver datos en nodos secundarios**

Conectar a un nodo secundario:

mongo \--port 27018

Permitir lecturas (solo si es estrictamente necesario):

rs.secondaryOk()

use prueba

db.usuarios.find()

**8\. Simular caída del nodo primario**

Cerrar el terminal del nodo 27017\.

Verificar que otro nodo sea promovido como primario con:

mongo \--port 27018

rs.isMaster()

Reiniciar el nodo 1:

mongod \--replSet RP \--dbpath="c:/data/nodo1" \--port 27017

Confirmar que vuelve a ser primario:

mongo \--port 27017

rs.isMaster()

**9\. Verificar restauración de roles**

	rs.status()

[image1]: <data:image/png;base64,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>