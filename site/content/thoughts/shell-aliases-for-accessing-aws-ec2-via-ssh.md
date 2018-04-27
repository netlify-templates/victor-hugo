+++
title = "Shell aliases for accessing your AWS EC2 instances via SSH"
subtitle = "Automating SSH access to your EC2 instances"
date = "2018-04-25T15:23:52+01:00"
months = [ "2018-04" ]
authors = [ "josé-san-leandro" ]
authorPhoto = "josé-san-leandro.jpg"
draft = "true"
tags = [ "osoco", "ssh", "aws", "bash", "zsh", "ec2" ]
summary = ""
background = "pharo-rodahe.jpg"
backgroundSummary = "pharo-rodahe.jpg"
+++

At OSOCO we use AWS extensively. In particular, we use CloudFormation to describe the
infrastructure for each platform.

Over time, we've come to agree on certain "best practices" or "patterns". We've seen
how our CloudFormation templates have evolved, trying to apply those patterns to each
concrete scenario.

We've also built some tools in-house to help us in our AWS duties. They're not as powerful
as products such as Terraform, but they do their job.

One of those little tools is a solution to easily connect to our EC2 instances.
Instead of checking the IP of the instance using the AWS Console, we leverage the AWS-CLI
to automatically create shell aliases based on the profile and stack combination.

Since it's composed of independent hacks and snippets, it's not something we could easily
package as a tool for you to download. Right now, to use it you'll need to understand and
customize it to your context.

The first step is to define a shell function to avoid us to repeat the information about
the AWS profile again and again. We included a minor hack to include `--no-include-email`
when running `aws ecr get-login`, but besides that, it just appends `--profile profile`
to the `aws` executable.

```bash
function aws-shortcut() {
    [ $# -lt 2 ] && echo "Usage: aws-shortcut profile cmd+" && return 1;
    local profile="${1}";
    shift;
    local first="${1}";
    local second="";
    if [ $# -ge 2 ]; then
        shift;
        second="${1}";
    fi
    shift;
    local aux="";

    if [[ "${first}" == "ecr" ]] && [[ "${second}" == "get-login" ]]; then
        aux="--no-include-email";
    fi

    aws --profile "${profile}" "${first}" "${second}" "${aux}" $@;
}
```

Now, we need a function to create /aliases/ for each one of your AWS profiles:
```bash
function generate-aws-profile-aliases() {
    local p;
    for p in $(cat ~/.aws/config | grep '\[profile ' | sed 's|\[profile ||g' | tr -d ']'); do
      alias aws-${p}="aws-shortcut ${p} $@";
    done
}
```

So far, if you add the previous functions to your login scripts, you'll be able to run
`aws-[your-profile]`, for each profile you have configured in your AWS CLI. And it will
automatically reflect new profiles you'll add in the future.

The next piece of the puzzle has to do with how to configure your SSH client options.
Instead of managing them all in your `~/.ssh/config`, rename it to `~/.ssh/misc.config`
and edit it to remove any hosts related to your AWS instances.

The idea is that the final `~/.ssh/config` file is built by concatenating any `~/.ssh/*.config`
file you define. Some of those files will be actually created by this AWS helper function:

```bash
function update-aws-ip() {
  [ -z "${1}" ] && echo "Usage: update-aws-ip [stack] [prefix] [aws-profile]" && return
  [ -z "${2}" ] && echo "Usage: update-aws-ip [stack] [prefix] [aws-profile]" && return
  [ -z "${3}" ] && echo "Usage: update-aws-ip [stack] [prefix] [aws-profile]" && return

  local _IPs="$(aws-${3} ec2 describe-instances --query "Reservations[].Instances[]" | jq ".[] | select(.Tags[].Value | test(\".*${1}.*\"; \"i\")) | .PublicIpAddress" | sort | uniq | grep -v null | tr -d '"' | head -n 1)";

  local -i _first=0;

  for i in ${_IPs}; do
    ssh-keygen -R ${i} > /dev/null 2> /dev/null
    ssh-keyscan -H ${i} >> ~/.ssh/known_hosts 2> /dev/null
    head -n -1 ~/.ssh/${2}-${1}.config > /tmp/.${1}.config
    echo "  Hostname ${i}" >> /tmp/.${1}.config
    mv -f /tmp/.${1}.config ~/.ssh/${2}-${1}.config
    if [ ${_first} -eq 0 ]; then
        echo -n ${i} | xclip
        _first=1;
    fi
    echo ${i}
    ifconfig ${VPN_INTERFACE} > /dev/null 2>&1 && sudo route add -host ${i} tun0
  done

  rm -f ~/.ssh/config
  cat ~/.ssh/*.config > ~/.ssh/config
}

```

## Créditos

- **Imagen de cabecera**: <a href="https://pixabay.com/en/old-lighthouse-la-palma-salinas-1538921/" target="_blank">Free-Photos</a> con licencia <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.
