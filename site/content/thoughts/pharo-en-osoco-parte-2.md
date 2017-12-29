+++
title = "Pharo en Osoco (parte 2)"
subtitle = "Histéresis Pharo"
date = "2017-12-29T15:23:52+01:00"
months = [ "2017-12" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "false"
tags = [ "osoco", "pharo", "smalltalk" ]
summary = ""
background = "pharo-histeresis.jpg"
backgroundSummary = "pharo-histeresis.jpg"
+++

En este segundo post continuamos recapitulando nuestra andadura con [Pharo](http://www.pharo.org) en OSOCO.

Este año 2017 ha sido un año decisivo en cuanto a nuestra capacidad para utilizar Pharo en proyectos reales. Pasó de ser un nicho de conocimiento de una o dos personas, a que el equipo entero esté familiarizado con Pharo.

El reto consistió en construir una aplicación basada en microservicios, de los cuales dos están implementados en Pharo.

Para explicar el papel de Pharo en esta aplicación, es necesario explicar a grandes rasgos esos dos microservicios.

El primero de ellos es un microservicio que recibe órdenes y desencadena (y almacena) los eventos resultantes. No tiene interfaz web ni de ningún otro tipo. Una vez en ejecución, su única entrada son los mensajes recibidos a través de una cola de [RabbitMQ](https://www.rabbitmq.com). Cuando recibe una nueva orden, se pone en marcha una implementación de [puertos y adaptadores](http://alistair.cockburn.us/Hexagonal+architecture), y se averigua la clase del [agregado](https://en.wikipedia.org/wiki/Domain-driven_design) que debe encargarse de la petición. Se instancia ese *agregado*, y se reconstruye utilizando todos sus eventos registrados en el pasado. Una vez reconstruido, se le solicita que gestione la orden recibida.

Dicho *agregado* tiene la responsabilidad de realizar las comprobaciones pertinentes e implementar la lógica de negocio, dando como resultado nuevos eventos.
Estos nuevos eventos pasan a su vez por el mecanismo de *puertos y adaptadores*, para finalmente registrarse en el almacén de eventos, y publicarse en un *exchange* de *RabbitMQ*.

Habría mucho que contar sobre cómo hemos aplicado *Domain-Driven Design*, *Event Sourcing*, y *Hexagonal*, cuándo y cómo usamos *proyecciones*, o cómo hacemos los despliegues. Pero sería una incursión demasiado densa y nos haría desviarnos de la temática original de este post. Usando una metáfora *gitnesiana*: el *merge* de esa rama no sería *fast-forward* ;).

El segundo de los microservicios ofrece una interfaz [REST](https://en.wikipedia.org/wiki/Representational_state_transfer) sobre el almacén de eventos. Interfaz que es utilizada por otro microservicio para realizar consultas y filtros.

Como se explicó en el [primer post]({{< relref "thoughts/pharo-en-osoco-parte-1.md" >}}), contábamos con **OpenBadges**. Uno de sus microservicios estaba implementado en consonancia con DDD, y además, anticipando su reutilización futura, se había dividido en dos módulos: uno de soporte DDD agnóstico respecto al dominio (**PharoEDA**), y el propio del dominio de gamificación.

Así pues sabíamos que podríamos aprovechar *PharoEDA* para, sobre él, empezar a construir nuestro nuevo dominio. Gracias a *PharoEDA* teníamos además soporte para tests unitarios y de integración basados en eventos, autodetección de manejadores de órdenes basados en *pragmas* (anotaciones), conexiones a *RabbitMQ* y a [MongoDB](https://www.mongodb.com), etc.

Sin embargo, había otros microservicios que implementar, y varias decisiones que tomar. Por un lado, decidimos que una solución basada en una aplicación [React](https://reactjs.org) comunicándose con un reducido número de [AWS Lambdas](https://aws.amazon.com/lambda/) detrás de [AWS API Gateway](https://aws.amazon.com/api-gateway/), era adecuada para el contexto del proyecto. También que para los otros microservicios con interfaz de usuario sería ventajosa nuestra experiencia con [Groovy](http://groovy-lang.org) y [Grails](https://grails.org). Pero que en cualquier caso, el pilar fundamental sería el microservicio basado en Pharo, y por eso lo llamamos **Core**.

Mientras sopesábamos cómo debía ser la arquitectura idónea, realizamos algunas sesiones de [Event Storming](https://en.wikipedia.org/wiki/Event_storming), para empezar a entender el dominio de la aplicación. Como resultado de esas sesiones, trasladamos los eventos y los *agregados* a los dominios de cada microservicio.
Los eventos también son el mecanismo principal por el que los microservicios se comunican entre sí, por lo que es necesario que estén de acuerdo en cuanto a su forma y su fondo. Para ello, en cada repositorio *git* de cada microservicio importamos como *submódulo* un repositorio común, que define los contratos de los eventos y las órdenes.

<hr class="section-divider"/>

El equipo dedicado a este proyecto incluye, entre otros, a 6 desarrolladores. En las primeras etapas de desarrollo, vimos conveniente que cada miembro se centrara en aquellos microservicios cuyas tecnologías dominara. Esa decisión nos permitió una mayor velocidad al principio, pero no favorecía el aprendizaje de Smalltalk.

Conforme la aplicación avanzaba en funcionalidades, constatamos que el desarrollo en el *Core* tenía partes automatizables. Adecuar el mecanismo de *puertos y adaptadores* conforme se añadían nuevas órdenes y eventos era una tarea rutinaria, pero imprescindible. Debido a eso, creamos un generador de código en Pharo: a partir de la definición de los contratos entre los microservicios, se generaba el código en Smalltalk personalizado para cada contrato. No era código redundante ni derivado de un mal diseño, sino todo aquéllo que detectamos que podría simplificar y agilizar el desarrollo. Gran parte del código generado lo constituían simples plantillas destinadas a ser modificadas, como por ejemplo las plantillas de los tests.

El desarrollo de esa herramienta permitió ahondar en características del lenguaje que estaban inexploradas.

Sin embargo, como contrapartida, el *Core* se consagraba como algo inescrutable para los *no iniciados*. No sólo porque programar en Smalltalk supone un cambio significativo en la forma de programar, sino porque tanto *PharoEDA* como los generadores de código escondían mucha complejidad. Aunque esconder esa complejidad es algo beneficioso, también imponía cierto respeto por la aparente falta de control sobre el comportamiento del sistema en su conjunto.

Para paliar esta situación, decidimos probar con sesiones de [**mob programming**](https://vimeo.com/207087295). Una vez resueltos algunos problemas iniciales inevitables, todos coincidimos en que fue una experiencia enriquecedora y útil, y por ello la acabamos repetiendo a lo largo del proyecto.

{{< vimeo 207087295 >}}

En el desarrollo del segundo microservicio usamos [Teapot](https://medium.com/@richardeng/precious-zinc-teapot-on-the-web-9e36a21c5576). Nos permitió constatar la calidad de los *frameworks* más consagrados en el ecosistema de Pharo, y también la velocidad de desarrollo a la que podríamos aspirar conforme ganásemos en experiencia.

Esas aspiraciones se han visto respaldadas tanto por el [MOOC](http://mooc.pharo.org) de Pharo como por el [curso](https://www.meetup.com/MadridSUG/events/244115960/) que organizó OSOCO. Ambos han contribuido a que todo el equipo dedicado a este proyecto pudiera trabajar sobre ambos microservicios con confianza y seguridad.

<hr class="section-divider"/>

Como conclusión, nuestro viaje exploratorio de Pharo ha estado influenciado siempre por la búsqueda del equilibrio entre:

- velocidad y visión de futuro,
- limitar el riesgo asumible en el proyecto frente a los beneficios a medio plazo,
- mejorar la productividad mientras combatimos los silos de conocimiento,
- contagiar el entusiasmo y vencer el escepticismo.

En OSOCO podemos concluir que hemos llegado a saborear la [histéresis](https://es.wikipedia.org/wiki/Hist%C3%A9resis) Pharo.


