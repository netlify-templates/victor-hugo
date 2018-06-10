+++
title = "Spring-Cloud-Stream and Spring-AMQP: the good, the bad and the ugly"
subtitle = "The story of an unexpected pull request"
date = "2018-06-09T21:21:15+01:00"
months = [ "2018-06" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "false"
tags = [ "osoco", "spring", "rabbitmq", "amqp", "spring-cloud-stream", "spring-amqp" ]
summary = "Spring-Cloud-Stream on top of Spring-AMQP saved us time, but didn't solve all of our problems"
background = "rabbit2.jpg"
backgroundSummary = "rabbit.jpg"
+++

# Background

We were building a microservice-based application. I won't give a detailed description, but
it's partly described in this diagram.

{{<figure src="/images/thoughts/sample-microservice-architecture-rabbitmq-commands-events.png">}}

The microservices involved use different technologies. Some are [Grails](https://grails.org/) applications,
some are implemented in [Pharo](http://pharo.org/), and the most recent one is a
[SpringBoot](https://spring.io/projects/spring-boot) application implemented in
[Groovy](http://groovy-lang.org/),
which uses [Spring-Cloud-Stream](https://spring.io/projects/spring-cloud-stream).

Beneath the Spring-Cloud-Stream abstraction the heavy-lifting work is done by
[Spring-AMQP](https://spring.io/projects/spring-amqp).

# The good

The code required to start consuming messages from a [RabbitMQ](https://www.rabbitmq.com/) queue is really simple:

```Java
@Service
class EventListener {

    /**
     * Receives a new event from the queue.
     * @param event the event received.
     */
    @StreamListener(RabbitMQChannels.QUEUE_NAME)
    void eventReceived(ApplicationPassed event) {
        // event handling
    }
}
```

Notice the `ApplicationPassed` class belongs to our domain. Spring-Cloud-Stream has no way to automatically
build our own instances from what it reads from the queue. For that, it expects us to provide
a custom converter:

```Java
@Component
class MyMessageConverter
    implements MessageConverter {

    @Override
    Object fromMessage(Message<?> message, Class<?> targetClass) {
        new Gson().fromJson(new String((byte[]) message.payload, 'UTF-8'), ApplicationPassed)
    }
    [..]
}
```

We use [Gson](https://github.com/google/gson) instead of
[JsonSlurper](http://docs.groovy-lang.org/latest/html/gapi/groovy/json/JsonSlurper.html) because our
event class has structure which needs to be parsed recursively.
It's not based on maps and lists.

Spring-Cloud-Stream needs some help to know how to start consuming messages from RabbitMQ.
A simple interface does the trick:

```Java
interface EventChannels {

    /**
     * The queue name (look for spring.cloud.stream.rabbit.bindings.input entries in application.properties):
     * spring.cloud.stream.rabbit.bindings.input.destination=myqueue
     */
    String QUEUE_NAME = 'input'

    @Input
    SubscribableChannel input()
}
```

After configuring the required settings in `application.properties`, the only missing step is to export
the converter as a bean so Spring sees it and injects it into the list of converters used
by Spring-Cloud-Stream. Somewhere in a class declared to provide configuration:

```Java
    @Bean
    @StreamMessageConverter
    MessageConverter buildPropertiesConverter() {
        new MyMessageConverter()
    }
```

For publishing messages the API is also simple. We're not using a processor since we encapsulate
logic in ports and adapters, so the consumer adapter cannot know the publisher adapter is also
Spring-Cloud-Stream's.

Anyway, to send a message to a RabbitMQ exchange, we just need to define a class with an output channel:

```Java
@EnableBinding(source)
@EnableAutoConfiguration
class CommandPublisher {
    // This matches application.properties binding.
    @Autowired
    MessageChannel output
    
    void send(UnpassApplication command) {
        this.output.send(new Gson().toJson(command))
    }
}
```

Also, the `application.properties` needs some configuration as well. At the very least, the name
of the exchange.

```
spring.cloud.stream.bindings.output.destination=myexchange
```

# The bad

Once we have everything set up, we encountered a problem when sending messages. A problem that
couldn't be solved easily. No converter or configuration setting could help us.

When you publish messages in a RabbitMQ exchange, you can define the message headers.
We currently use it to provide some basic metadata information to the consumer. 
While you can customize it and send your own, we only declared "Hey, this message is in JSON format".
That's the meaning of the *content-type* header.

So we added the configuration setting:
```
spring.cloud.stream.bindings.output.content-type=application/json
```

However, other microservices were unable to consume the message, and sent it to the Dead-Letter queue.
Why? Because they didn't take into account the *content-type* header, but the actual content type.
Spring-AMQP underneath Spring-Cloud-Stream was declaring the type of the content as `application/octet-stream`.

Regardless of your converter or the configuration setting, you can only customize the message headers.
The actual content type is determined by the class of the message payload you try to send.

And there're only three options: a byte array, a String, or a serialized instance.
The first one ends up as `application/octet-stream`.
The second, as `text/plain`. The latter, as `application/x-java-serialized-object`.

That logic is defined in
[**org.springframework.amqp.support.converter.SimpleMessageConverter**](https://github.com/spring-projects/spring-amqp/blob/master/spring-amqp/src/main/java/org/springframework/amqp/support/converter/SimpleMessageConverter.java#L129),
and there's nothing you can do to customize it.

Unless you propose a solution, of course. More information in [Pull Request #763](https://github.com/spring-projects/spring-amqp/pull/763).

# The ugly

Spring-Cloud-Stream was easy to use. However, I found it very difficult to know which setting
in `application.properties` was really meaningful. I still don't know how to be sure which
component of the Spring ecosystem gets affected by which setting.

It forced us to change our queue naming too. If you don't define a **group** for the input binding,
an anonymous queue gets created each time. However, the *group* feature names the queue
using a **destination.group** scheme. That's fine, but we don't use that convention anywhere else.

While the pull request gets evaluated, our microservice has copied the `SimpleMessageConverter` class 
directly into its codebase. That way, the *classloader* doesn't load it when loading Spring-AMQP, since it's
already loaded. This kind of *class shadowing* is not a desirable approach, but we preferred
it before changing other microservices to make the *content-type* header take preference over
the message content type.

In summary, Spring-Cloud-Stream was really easy to deal with in the code. When testing it at
runtime, we had to do some sacrifices. But in the integration testing phase we encountered
the content-type issue that took us quite some time to solve.

## Credits

- **Images**:
  - <a href="https://pixabay.com/en/rabbit-garden-bunny-spring-green-1422882/" target="_blank">Rabbit</a> licensed under <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.
  - <a href="https://pixabay.com/en/rabbit-mammal-green-spring-brown-214540/" target="_blank">Rabbit</a> licensed under <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.





