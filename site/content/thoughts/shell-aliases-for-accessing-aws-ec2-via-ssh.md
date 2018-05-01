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

Over time, we've come to agree on certain "best practices" or "patterns". We can now see
how our CloudFormation templates have evolved after applying those patterns to each
concrete scenario.

We've also built some tools in-house to help us in our AWS duties. They're not as powerful
as products such as Terraform, but they do their job.

One of those little tools is a solution to easily connect to our EC2 instances.
Instead of checking the IP of the instance using the AWS Console, we leverage the AWS-CLI
to automatically create shell aliases based on the profile and stack combination.

Since it's composed of independent hacks and snippets, it's not something we could easily
package as a tool for you to download. Right now, to use it you'll need to understand and
customize it to your context.

We'll define some functions in a new file: `~/.aws-aliases.sh`.

The first step is to define a shell function to avoid us to repeat the information about
the AWS profile again and again. We included a minor hack to include `--no-include-email`
when running `aws ecr get-login`, but besides that, it just appends `--profile profile`
to the `aws` executable.

```bash
## Runs AWS CLI using given profile, and uses "--no-include-email" if we try to
## run ecr get-login.
## Parameters:
## -> 1: The AWS profile.
## Returns:
## - The result of running AWS CLI.
## Example:
##   aws-shortcut "prof1" ecr get-login
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

Our solution is not constrained to any specific AWS profile. To work for each one
you might have configured already, we'll make use of a helper function to list them all.

```bash
## Retrieves the list of AWS Profiles already configured, 
## based on the contents of ~/.aws/config.
## Returns:
## - 0 If the profiles were found; 1 otherwise.
## Example:
##   if list-aws-profiles; do
##     for profile in ${RESULT}; do
##       echo "AWS Profile found: ${profile}";
##     done
##   fi
function list-aws-profiles() {
  local -i rescode;
  local result="$(cat ~/.aws/config | grep '\[profile ' | sed 's|\[profile ||g' | tr -d ']')";
  rescode=$?;

  if [ ${rescode} -eq 0 ]; then
    export RESULT="${result}";
  fi

  return ${rescode};
}
```

Now, we need a function to create /aliases/ for each one of your AWS profiles:
```bash
## Declares shell aliases to run aws-shortcut for each AWS profile found.
## Returns:
## - 0 If any shell alias was created; 1 otherwise.
## Example:
##   if generate-aws-profile-aliases; then
##     echo "AWS profile aliases generated successfully.";
##   fi
function generate-aws-profile-aliases() {
  local -i rescode=1;
  local p;

  if list-aws-profiles; then
    for p in ${RESULT}; do
      alias aws-${p}="aws-shortcut ${p} $@";
      rescode=0;
    done
  fi

  return ${rescode};
}
```

So far, if you add the previous functions to your login scripts, you'll be able to run
`aws-[your-profile]-ip`, for each profile you have configured in your AWS CLI. And it will
automatically reflect new profiles you'll add in the future.

Similarly, we can retrieve all running EC2 instances dynamically. It'll come in handy later.
Here's a function to accomplish it:

```bash
## Retrieves the running EC2 instances.
## Parameters:
## -> 1: The AWS profile.
## Returns:
## <- 0 If the EC2 instances could be listed; 1 Otherwise.
## <- RESULT: A space-separated list with the names of the EC2 instances.
## Example:
##   if list-ec2-instances "prof1"; then
##     for i in ${RESULT}; do
##       echo "EC2 instance: ${i}"
##     done
##   fi
function list-ec2-instances() {
  local -i rescode=1;
  local profile="${1}";

  [ -z "${profile}" ] && echo "Usage: list-ec2-instances [aws-profile]" && return ${rescode};

  local result="$(aws-${profile} ec2 describe-instances --query "Reservations[].Instances[]"  | jq ".[] | select(.State.Name = \"running\") | .Tags[] | select(.Key == \"Name\") | .Value")";
  rescode=$?;

  if [ ${rescode} -eq 0 ]; then
    export RESULT="${result}";
  fi

  return ${rescode};
}
```

The next piece of the puzzle has to do with how to configure your SSH client options.
Instead of managing them all in your `~/.ssh/config`, rename it to `~/.ssh/misc.config`
and edit it to remove any hosts related to your AWS instances.

The idea is that the final `~/.ssh/config` file is built by concatenating any `~/.ssh/*.config`
file you define. Some of those files will be actually created by this AWS helper function:

```bash
## Updates the SSH client configuration to connect to given EC2 instance.
## - Parameters:
## -> 1: The resource name.
## -> 2: The name of the AWS profile.
## - Environment variables:
##   - VPN_INTERFACE: The name of the interface to be use to route all traffic
##     to the AWS resource. This is usually needed when your SecurityGroups include
##     specific CIDRs.
## - Returns:
##   0: If the configuration has been updated successfully;
##   1: if the parameters are invalid;
##   2: If the configuration wasn't changed for some reason.
## Example:
##   if update-ec2-ssh nginx clientX; then
##     echo "SSH configuration for nginx (pre) in clientX account updated successfully";
##   fi
function update-ec2-ssh() {
  local -i rescode=1;
  local resource="${1}";
  local profile="${2}";
  
  [ -z "${resource}" ] && echo "Usage: update-ec2-ssh [resource] [aws-profile]" && return ${rescode};
  [ -z "${profile}" ] && echo "Usage: update-ec2-ssh [resource] [aws-profile]" && return ${rescode};
  for s in jq ssh-keygen ssh-keyscan; do which ${s} 2> /dev/null > /dev/null || echo "This function requires ${s}. Please install it and try again." && rescode=1; done
  if [ ${rescode} -ne 0 ]; then
    return ${rescode};
  fi

  rescode=2;
  
  local ip="$(aws-${2} ec2 describe-instances --query "Reservations[].Instances[]" | jq ".[] | select(.Tags[].Value | test(\"^${resource}$\"; \"i\")) | .PublicIpAddress" | sort | uniq | grep -v null | tr -d '"' | head -n 1)";
  rescode=$?;

  if [ ${rescode} -eq 0 ]; then
    local file="~/.ssh/${profile}-${environment}${resource}.config";
    if [ ! -e ${file} ]; then
      cat <<EOF > ${file}
Host ${profile}-${environment}${resource}
  User ec2-user
  StrictHostKeyChecking no
  IdentityFile ~/.ssh/${profile}.pem
  Hostname ${ip}
EOF
    else
      [ -n "${VPN_INTERFACE}" ] && ifconfig ${VPN_INTERFACE} > /dev/null 2>&1 && sudo route del -host $(grep Hostname ${file} | awk '{print $2;}') ${VPN_INTERFACE} 2> /dev/null > /dev/null
    fi
    ssh-keygen -R ${ip} > /dev/null 2> /dev/null
    ssh-keyscan -H ${ip} >> ~/.ssh/known_hosts 2> /dev/null
    head -n -1 ${file} > /tmp/.${resource}.config
    echo "  Hostname ${ip}" >> /tmp/.${resource}.config
    mv -f /tmp/.${resource}.config ${file}
    rm -f ~/.ssh/config
    cat ~/.ssh/*.config > ~/.ssh/config
  fi
  which xclip 2> /dev/null > /dev/null && echo -n ${ip} | xclip
  echo ${ip}
  [ -n "${VPN_INTERFACE}" ] && ifconfig ${VPN_INTERFACE} > /dev/null 2>&1 && sudo route add -host ${i} ${VPN_INTERFACE} 2> /dev/null > /dev/null

  return ${rescode};
}
```

This function expects 2 arguments: the name of the EC2 instance and the name of the AWS profile (as defined in your
`~/.aws/credentials`).

After some validations, it uses AWS CLI to get information about the instance. AWS CLI provides this information in JSON format. We use `jq` to extract the IP address from it.

Then if everything went fine, we check if the ssh configuration file for the requested instance exists.
If it's missing, we create it with some default settings.
Otherwise, we modify the last line with the new `Hostname [new-ip]` entry.
The script prints the new IP, copies it to the clipboard, and adds the new route to the route table if we
access the EC2 instances via a VPN.

Now we need another step: dynamically generate shell aliases to update the SSH configurations for
each EC2 instance.

```bash
## Generates the EC2 ssh aliases for a given profile.
## Parameters:
## -> 1: The AWS profile name.
## Returns:
## - 0 If the SSH alias get generated; 1 Otherwise.
## Example:
##   if generate-ec2-ssh-aliases-for-profile "prof1"; then
##     echo "SSH aliases generated for your EC2 instances in prof1.";
##   fi
function generate-ec2-ssh-aliases-for-profile() {
  local -i rescode=1;
  local profile="${1}";
  local i;

  [ -z "${profile}" ] && echo "Usage: generate-ec2-ssh-aliases [aws-profile]" && return ${rescode};

   if list-ec2-instances "${profile}"; then
     for i in ${RESULT}; do
       alias ${profile}-${i}-ip="${profile}-ip ${i}";
       alias ssh-${profile}-${i}="${profile}-${i}-ip; ssh ${profile}-${i}";
     done
   fi
}
```

To generate all aliases for all EC2 instances in all your AWS profiles, we just need to call the
function above for all your AWS profiles:

```bash
## Generates EC2 ssh aliases for all AWS profiles.
## Returns:
## - 0 If the aliases get generated correctly; 1 Otherwise.
## Example:
##   if generate-all-ec2-ssh-aliases; then
##     echo "Shell aliases generated for all AWS profiles."
##   fi
function generate-all-ec2-ssh-aliases() {
  local -i rescode=1;
  local awsProfiles;
  if list-aws-profiles; then
    for awsProfile in ${RESULT}; do
      if generate-ec2-ssh-aliases-for-profile "${awsProfile}"; then
        rescode=0;
      else
        rescode=1;
        break;
      fi
    done
  fi

  return ${rescode};
}
```

We're almost done. We just need to include the `~/.aws-functions.sh` file in our login script, and run `generate-all-ec2-ssh-aliases` afterwards:

```bash
[..]
source ~/.aws-functions.sh
generate-aws-profile-aliases
generate-all-ec2-ssh-aliases
[..]
```

Thanks to autocompletion, when you need to connect to one of your EC2 instances,
you can just type `ssh-`, press `TAB`, and get the complete list for you.


## Créditos

- **Imagen de cabecera**: <a href="https://pixabay.com/en/old-lighthouse-la-palma-salinas-1538921/" target="_blank">Free-Photos</a> con licencia <a href="https://creativecommons.org/publicdomain/zero/1.0/deed.en">CC0 Creative Commons</a>.






