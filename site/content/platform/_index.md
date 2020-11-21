---
title: A unified platform for research and clinical deployments
image: images/temp.jpg
bgcolor: "#242F40"
subtitle: Design, discover, and deploy personalized interventions at scale with re-usable modules.
introtitle: Mix and match modules to tailor interventions for desired outcomes
introsubtitle: Way to Health capabilities are built and made available as re-usable modules. 
introtext: Researchers and clinicians have combined these modules in different ways to create innovative interventions rapidly, test them and quickly deploy them fully integrated with their EHR. 
pageurl: platform
contactid: platformcontact

modules:
  introtitle: Build your own intervention quickly
  introsubtitle: Way to Health capabilities are grouped into modules. Configure them to address your specific needs and combine them together to quickly build, test and deploy interventions. Choose your deployment model - pilot, standalone or scaled and EHR integrated.
  module: 
    - module_name: Conversations
      image: images/conversations.gif
      image_caption:
      listing:
        - subtitle: Two-way Texting
          module_name: Conversations
          description: Communication with patients or study participants is key to engaging them. Choose from a variety of communication techniques or combine them tailored to a patient's behavior. Texts can be sent out based on set schedules and / or rules. These configuration rules can be as simple as responding with a personalized "Great job, John" or as complex as evaluating blood pressure values and generating an in-basket message to the physician.
          id: patcomm
        - subtitle: Survey Management
          module_name: Conversations
          description: In cases where more data needs to be collected (demographics, symptoms, etc.), the system offers the ability to create surveys. Create your own survey using the built-in survey creation and deployment tool. These surveys can be sent out to patients based on specific schedules and simple or complex rules. Short surveys can be administrated over text as well. 
          id: patcomm
      is_even: true
      id: patcomm
    - module_name: Remote Monitoring
      image: images/peng/devices.png
      image_caption:
      listing:
        - subtitle: Vitals and Activity Monitoring
          module_name: Remote Monitoring
          description: The platform integrates directly with a number of biomedical devices to capture vitals directly from the patient / participant. The kinds of vitals captured include blood pressure, medication adherence, sleep tracking, weight, blood glucose and many more continue to be added. Additional devices are added quickly on request.
          id: remote
        - subtitle: Patient Reported Outcomes (PRO) Capture
          module_name: Remote Monitoring
          description: The system also allows patients to report their PROs, adverse events (AEs), symptoms and more via structured or unstructured conversations. These can be patient initiated and follow decision trees of your choosing. 
          id: remote
      is_even: false
      id: remote
    - module_name: Randomized Control Trials
      image: images/peng/rct.jpg
      image_caption:
      listing:
        - subtitle: Arms & Randomization
          module_name: Randomized Control Trials
          description: Setup multiple arms for studies including a control arm. The platform also offers multiple computerized randomization of participants, including the configurable choices for stratified, blocked, weighted, and adaptive randomization strategies. Ongoing management of participants via a "triage" view is also available out-of-the-box.
          id: rct
        - subtitle: Enrollment & eConsent
          module_name: Randomized Control Trials        
          description: Setup customized enrollment flows to maximize participant uptake. Run virtual trials in any state and manage it all remotely using tools such as intake surveys and eConsenting. Way to Health has been used to support over 150 different studies and the platform, past and current Principal Investigators (PIs) have credibility among the research and funding communities. 
          id: rct
      is_even: true
      id: rct
    - module_name: Program & Survey Libraries
      image: images/duplicate.svg
      image_caption:
      listing:
        - subtitle: Program Library
          module_name: Study Library        
          description: All programs - research studies as well as clinical projects, are available to be build upon. The programs can be copied over in a couple of clicks and then modified as needed. This can accelerate RCT and clinical deployments and reduce the time to live from months to days or weeks. 
          id: library
        - subtitle: Survey Library
          module_name: Study Library        
          description: Programs implemented on Way to Health have utilized a number of survey instruments. Some are validated and others have been designed for project specific purposes. All of these are available for rapid re-use and deployment. Data collected from these can be stored in a custom or in our standardized models for easy analysis.
          id: library
      is_even: false
      id: library
    - module_name: Behavioral Science & Economics
      image: images/peng/chibe.png
      image_caption:
      listing:
        - subtitle: Gamification & Social
          module_name: Behavioral Science & Economics
          description: Games and social media are significant drivers of human behavior. The platform allows patients to earn points, level up, use lifelines and more. These features can be combined with peer competition or support.
          id: be
        - subtitle: Financial Incentives
          module_name: Behavioral Science & Economics        
          description: Lotteries, loss and gain framed incentives and much more can be easily applied to activities - steps, weighings, pretty much any data gathered by the platform from any data source. Apply different strategies to different populations and depending on the type of activity.
          id: be                 
      is_even: true
      id: be
    - module_name: Rules Engine
      image: images/peng/rules3.png
      image_caption:
      listing:
        - subtitle: Schedule or event driven
          module_name: Rules Engine
          description: All interventions require recurrence based on a defined period - hours, days, weeks or months or off an event (such as admission). Research studies or clinical deployments both require this to be further tailored by each arm or patient. The platform has been designed to support these use cases and more.
          id: rulesengine
        - subtitle: Alerts & Incidents
          module_name: Rules Engine
          description: To maximize the productivity of staff and providers, the Way To Health platform allows for the creation of incidents or alerts whenever certain exception criteria are met. Configure notifications depending on the users role.
          id: rulesengine
      is_even: false
      id: rulesengine
    - module_name: EHR integration
      image: images/peng/integration.jpg
      image_caption:
      listing:
        - subtitle: Bi-directional Integration
          module_name: EHR integration
          description: It is our belief that EHRs should be the system of record for all patient data. Additionally, any provider action needed should also be done via the EHR. With this in mind, the platform provides bi-directional integration currently with Epic (and additional EHRs on request).
          id: ehr
        - subtitle: Way to Health Inside
          module_name: EHR integration
          description: We offer multiple ways in which we can integrate with the EHR. Via embeds in the EHR itself, HL7 based, API (FHIR, Open.Epic, other) and many more as needed. 
          id: ehr
      is_even: true
      id: ehr
---