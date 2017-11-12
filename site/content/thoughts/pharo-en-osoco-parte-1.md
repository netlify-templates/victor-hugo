+++
title = "Pharo en Osoco (parte 1)"
subtitle = "Taking the Pharo Red Pill"
date = "2017-11-12T15:23:52+01:00"
months = [ "2017-11" ]
authors = [ "rafael-luque" ]
authorPhoto = "rafael-luque.jpg"
draft = "false"
tags = [ "pharo", "smalltalk" ]
summary = ""
background = "balloons-lighthouse.jpg"
backgroundSummary = "road-to-pharo.jpg"
+++

En 2014 encontramos la ventana de oportunidad idónea para introducir [Pharo Smalltalk](http://pharo.org)
en OSOCO. Se trataba del desarrollo de **OpenBadges**, un producto dirigido a ofrecer *Gamification
as a Service*. Tratándose de un producto interno teníamos total libertad para la elección de tecnologías
y en estos casos siempre aplicamos la recomendación de Paul Graham en *[Beating the Averages](http://www.paulgraham.com/avg.html)*:

<blockquote>When you choose technology, you have to ignore what other people are doing, and consider only what will work the best.</blockquote>

Personalmente llevaba años cautivado por el potencial que intuía en Smalltalk. Había leído prácticamente toda la bibliografía existente, que en gran parte está [disponible](http://stephane.ducasse.free.fr/FreeBooks.html) [gratuitamente](http://files.pharo.org/books/). También conocía la comunidad a través de sus listas de distribución de correo. Incluso me animé a acudir como un completo *noob* a la conferencia [ESUG 2012](http://www.esug.org/wiki/pier/Conferences/2012?_s=s1rYugvjeUTjkSPd&_k=rOoCWi79HtdnAgdZ&_n&23) que se celebró durante una semana en Gante.

Había desarrollado pequeñas cosas, primero en [Squeak](http://squeak.org/) y luego en [Pharo](http://pharo.org), pero nunca nada más serio que una [kata](https://vimeo.com/19521704) o una sencilla aplicación web con [Seaside](http://www.seaside.st/), así que tenía algunas intuiciones sobre cómo podría mejorar nuestra forma de trabajar en OSOCO, pero ninguna certeza y bastantes dudas.

El proyecto **OpenBadges** nos permitió validar por primera vez nuestras hipótesis sobre Smalltalk en el contexto de un proyecto de desarrollo de software profesional.

Algunas de nuestras primeras conclusiones aparecen en la siguiente presentación para una reunión del grupo [Madrid Smalltalk User Group](https://www.meetup.com/MadridSUG/).

{{< speakerdeck 127d271366df46a2a2371c9b8210c215 >}}

Los factores diferenciales que mencionábamos entonces eran:

- Sencillez, consistencia y comprensibilidad.
- Programación de *sistemas vivos*.
- Ciclos de realimentación más cortos.
- Productividad.
- Construcción de herramientas específicas del dominio.
- Facilitador de *Domain-Driven Design*.
- Agilidad hasta sus últimas consecuencias.

Aunque ya teníamos claro que podríamos beneficiarnos de todas estas ventajas, en realidad, éramos conscientes
de que todavía estábamos lejos de extraer todo el potencial posible y que en muchas ocasiones seguíamos
desarrollando con la mentalidad de Java o Groovy, pero con la sintaxis de Smalltalk. No habíamos hecho
más que iniciar un largo camino de aprendizaje y descubrimiento.

Acabábamos de aceptar el reto de vencer el [FUD](https://en.wikipedia.org/wiki/Fear,_uncertainty_and_doubt) y de ir contracorriente. Habíamos optado por la *pastilla roja*, por quedarnos en el *País de las Maravillas*, pero todavía no eramos conscientes de hasta dónde nos llevaría la madriguera del conejo.

Tras este primer proyecto, hemos vuelto a emplear Pharo en otros dos proyectos: un ATS (*Applicant Tracking System*) para un gran cliente y [*Contestia*](https://contestia.es), una línea de productos de software internos.
Estas experiencias nos han dado la oportunidad de profundizar en sus implicaciones, reflexionar sobre cómo
nos está afectando y trabajar también en vencer alguno de los inconvenientes que nos planteó inicialmente.

Estamos tan convencidos de su idoneidad que lo hemos incluido en el [radar de tecnologías](https://bit.ly/OSOCOTechRadar) del equipo de ingeniería como un **lenguaje estratégico**, al mismo nivel que nuestros lenguajes de cabecera: Java y Groovy.

Creo que ahora nos encontramos en una segunda fase de madurez, en la que una vez superada la epifanía inicial,
somos más conscientes de cómo exactamente podemos aprovechar el potencial de Smalltalk en OSOCO.

Próximamente publicaremos una **segunda parte de este post** describiendo esta otra fase de nuestra experiencia de adopción de Smalltalk en OSOCO.
