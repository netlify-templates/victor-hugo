+++
title = "Hackatrips 2018 - Echotel"
subtitle = "El DAO que no dio tiempo a hacer"
date = "2018-01-24T07:23:52+01:00"
months = [ "2018`-01" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "true"
tags = [ "osoco", "hackatrips", "hackathon", "dao", "blockchain", "ethereum" ]
summary = ""
background = "pharo-rodahe.jpg"
backgroundSummary = "pharo-rodahe.jpg"
+++

Este pasado fin de semana se ha celebrado la [II Edición de Hackatrips FITUR 2018](http://www.hackatrips.com), esta vez con la temática de innovación en el sector turístico.

De forma imprevista, alguien sugirió volver a participar, recordando que en la primera edición la experiencia fue muy positiva. Intensa, agotadora, pero positiva.
Así que unos cuantos nos animamos. Como superábamos el tamaño máximo para un solo equipo, finalmente convencimos a algunos amigos y nos dividimos en dos grupos.

Esta vez nos apetecía proponer algo que tuviera que ver con Blockchain. Pensábamos que, dada la repercusión que esta temática tiene en los medios actualmente, cualquier propuesta de este estilo podría parecer poco original.
También intuíamos que no sería fácil.

Nuestro equipo lo formamos José Canfrán, Adriana Varela, Caridad San Leandro, José San Leandro Ros, y yo. Nuestra idea la llamamos Echotel, y era una propuesta continuísta con la idea que presentamos en el primer Hackatrips: impulsar el turismo sostenible.

En esta ocasión nuestro *target* eran los hoteles. &iquest;Cómo convencerles para impulsar un cambio real en ofrecer servicios respetuosos con el medio ambiente y con el desarrollo sostenible?
Nuestra propuesta consiste en definir un criterio por el cual los hoteles puedan optar a certificaciones que denoten su grado de compromiso con el turismo sostenible.

Para ello, nos valemos de la red blockchain de Ethereum, en la cual, mediante un **SmartContract**, gestionamos la reputación de cada hotel.

Así pues nos propusimos implementar una prueba de concepto lo más simple posible: un buscador de camas. Envolvimos el API que nos proporcionaba uno de los patrocinadores del hackathon, HotelsCombined, para añadirle un dato más a cada resultado que éste nos devolvía: la reputación. A esta puntuación la denominamos *GreenScore*.

La reputación, como hemos dicho, la otorga un *contrato inteligente*. Lo implementamos y lo desplegamos sobre un blockchain local (**ganache**). Asignamos, a modo de prueba, unas reputaciones iniciales para los hoteles que respondía a unos criterios de búsqueda que acordamos previamente. Era un hackathon, a fin de cuentas. Con más esfuerzo del esperado, fruto en gran medida de nuestra inexperiencia, conseguimos llamar al contrato desde un servidor Express en el que definimos nuestro API REST que envolvía el buscador de hoteles.

En paralelo, también estábamos ocupados implementando dos aplicaciones webs: la del buscador y la de una entidad certificadora. Usamos Apiary para poder trabajar en paralelo y ser más rápidos.

La entidad certificadora necesitaba poder evaluar las características de un hotel y su relevancia en cuanto a su compromiso por la sostenibilidad. Para ello, añadimos la función correspondiente en el contrato, y así poder ejecutarla desde el propio servidor Express donde estaba desplegada la aplicación. Así podríamos demostrar una de las características más atractivas para los hoteles: acortar el ROI. En cuanto un hotel llevara a cabo acciones que redundaran en mejorar el turismo sostenible, instantáneamente vería cómo su posición en nuestro *SERP* mejoraría. No tendría que esperar semanas ni meses para comprobarlo.

Llegados a este punto, queríamos incentivar a los turistas para llevar a cabo acciones relevantes en el destino. Como ejemplos, pensamos en repoblar bosques o realizar actividades solidarias. Imaginamos acuerdos con ONGs, y desarrollamos una prueba de concepto que sirviera para ilustrar algún momento representativo. Por ejemplo, la posibilidad de que un turista recibiera una acreditación por haber realizado una acción concreta, corroborada por alguna ONG comprometida con la iniciativa.

La mejor forma de implementar esta forma de gamificación era un token Ethereum. Así, podríamos cerrar el círculo y usarlo para canjear descuentos al reservar una estancia usando el buscador.

La propuesta de valor tenía dos destinatarios. Por un lado, los hoteles, que tendrían la oportunidad de apostar por el turismo sostenible y así captar turistas comprometidos, y previsiblemente más atractivos para el hotel. Por otro lado, los turistas tendrían mecanismos para realizar acciones beneficiosas en el destino, y que les incentivaría económicamente.

Sólo necesitamos implementar el token. Sin embargo, desde la organización se pidió que no "hiciéramos una nueva criptomoneda". Eso nos creó cierta confusión inicial, porque influenciar en qué ideas llevar a cabo no es lo habitual en este tipo de competiciones.

En cualquier caso, el tiempo para implementar lo que queríamos hacer era muy escaso, y decidimos enfocarlo a cómo podríamos implementar un DAO relacionado con esta propuesta.

Eso es lo que intentamos explicar en la presentación. Desafortunadamente, no lo conseguimos. Afortunadamente, no nos importó demasiado.

Con más tiempo y calma, nuestra propuesta se basaba en añadir a lo anterior un *crawler* de servicios de hostelería. Por cada hotel encontrado, lo evaluaríamos en cuanto a sostenibilidad utilizando un algoritmo o IA. Si no superase cierto umbral, comunicaríamos al hotel nuestras recomendaciones personalizadas para mejorar en este sentido. Si por el contrario su calificación fuera positiva, se le invitaría a contribuir a nuestra iniciativa con una donación en criptomonedas, lo que a su vez le permitiría recibir tráfico de nuestro buscador, y recíprocamente nosotros recibir ingresos por afiliación.

Dicho *crawler* lo desplegaríamos en uno de los servicios de *hosting* que ya soportan pago por criptomonedas. Podríamos hacer que el rastreador se regulase en función de sus propios fondos disponibles, teniendo en cuenta el coste de ejecutar *SmartContracts* y el coste de su propio *hosting*.

## Créditos

- **Imagen de cabecera**: <a href="https://pixabay.com/en/old-lighthouse-la-palma-salinas-1538921/" target="_blank">Free-Photos</a> con licencia <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.
