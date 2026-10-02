pipeline {
    agent any

    options {
        skipDefaultCheckout(true)
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        IMAGE_NAME      = 'sanikaprog/student-accommodation-system'
        REGISTRY_CREDS  = 'docker-hub-credentials'
        IMAGE_TAG       = "${env.BUILD_NUMBER}"
        VERSION         = "1.0.${env.BUILD_NUMBER}"
        NODE_TOOL       = 'Node-20'
        MONGOMS_VERSION = '7.0.14'
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }

        // 1. BUILD
        stage('Build') {
            steps {
                nodejs(env.NODE_TOOL) { sh 'npm ci' }
                sh '''
                    docker build \
                      --label build=$BUILD_NUMBER \
                      --label commit=$(git rev-parse --short HEAD) \
                      -t $IMAGE_NAME:$IMAGE_TAG .
                    docker image inspect $IMAGE_NAME:$IMAGE_TAG --format 'Built image {{.Id}} ({{.Size}} bytes)'
                '''
            }
        }

        // 2. TEST
        stage('Test') {
            steps {
                nodejs(env.NODE_TOOL) {
                    sh '''
                        node -e "const {MongoMemoryServer}=require('mongodb-memory-server'); MongoMemoryServer.create().then(m=>m.stop()).then(()=>console.log('mongod binary ready'))" || true
                        npm test -- --ci
                    '''
                }
            }
            post {
                always { archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true }
            }
        }

        // 3. CODE QUALITY
        stage('Code Quality') {
            steps {
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    nodejs(env.NODE_TOOL) { sh 'npm run lint' }
                }
                withSonarQubeEnv('SonarQube') {
                    sh "${tool 'SonarScanner'}/bin/sonar-scanner -Dsonar.projectVersion=${VERSION}"
                }
                timeout(time: 5, unit: 'MINUTES') {
                    script {
                        def qg = waitForQualityGate()
                        echo "SonarQube quality gate status: ${qg.status}"
                        if (qg.status != 'OK') {
                            unstable("Quality gate status: ${qg.status}")
                        }
                    }
                }
            }
        }

        // 4. SECURITY
        stage('Security') {
            steps {
                nodejs(env.NODE_TOOL) {
                    sh 'npm audit --json > npm-audit.json || true'
                    catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                        sh 'npm audit --omit=dev --audit-level=high'
                    }
                }
                sh '''
                    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ \
                      aquasec/trivy:latest image --no-progress --severity HIGH,CRITICAL --exit-code 0 \
                      $IMAGE_NAME:$IMAGE_TAG | tee trivy-report.txt
                '''
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    sh '''
                        docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v trivy-cache:/root/.cache/ \
                          aquasec/trivy:latest image --no-progress --severity CRITICAL --ignore-unfixed --exit-code 1 \
                          $IMAGE_NAME:$IMAGE_TAG
                    '''
                }
            }
            post {
                always { archiveArtifacts artifacts: 'npm-audit.json,trivy-report.txt', allowEmptyArchive: true }
            }
        }

        // 5. DEPLOY (staging, port 5001)
        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET')]) {
                    sh 'APP_IMAGE=$IMAGE_NAME:$IMAGE_TAG docker compose -f docker-compose.staging.yml up -d --remove-orphans'
                    script { waitHealthy('sas-staging-app') }
                    sh '''
                        docker exec sas-staging-app wget -qO- http://localhost:5000/health
                        docker exec sas-staging-app wget -qO- http://localhost:5000/api/student
                        docker exec sas-staging-app wget -qO- http://localhost:5000/metrics | head -5
                    '''
                }
            }
        }

        // 6. RELEASE (version tag, push, production on port 5000, rollback on failure)
        stage('Release') {
            steps {
                script {
                    env.PREV_IMAGE = sh(returnStdout: true,
                        script: "docker inspect -f '{{.Config.Image}}' sas-prod-app 2>/dev/null || true").trim()
                }
                sh '''
                    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:v$VERSION
                    docker tag $IMAGE_NAME:$IMAGE_TAG $IMAGE_NAME:latest
                '''
                catchError(buildResult: 'SUCCESS', stageResult: 'UNSTABLE') {
                    withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDS,
                                                      usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
                        sh '''
                            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                            docker push $IMAGE_NAME:$IMAGE_TAG
                            docker push $IMAGE_NAME:v$VERSION
                            docker push $IMAGE_NAME:latest
                        '''
                    }
                }
                withCredentials([string(credentialsId: 'jwt-secret', variable: 'JWT_SECRET')]) {
                    script {
                        try {
                            sh 'APP_IMAGE=$IMAGE_NAME:v$VERSION docker compose -f docker-compose.prod.yml up -d --remove-orphans'
                            waitHealthy('sas-prod-app')
                        } catch (err) {
                            if (env.PREV_IMAGE?.trim()) {
                                echo "Release failed, rolling back to ${env.PREV_IMAGE}"
                                sh 'APP_IMAGE=$PREV_IMAGE docker compose -f docker-compose.prod.yml up -d --remove-orphans'
                            }
                            throw err
                        }
                    }
                }
            }
        }

        // 7. MONITORING
        stage('Monitoring') {
            steps {
                sh '''
                    for i in 1 2 3 4 5; do docker exec sas-prod-app wget -qO- http://localhost:5000/health > /dev/null; done
                    sleep 20
                    docker exec sas-prod-prometheus wget -qO- http://localhost:9090/-/healthy
                    docker exec sas-prod-prometheus wget -qO- http://localhost:9090/api/v1/targets | grep -q '"health":"up"'
                    echo "Alert rules state:"
                    docker exec sas-prod-prometheus wget -qO- http://localhost:9090/api/v1/alerts
                '''
            }
        }
    }

    post {
        always  { echo 'Pipeline finished.' }
        success { echo "Released ${IMAGE_NAME}:v${VERSION}" }
        failure { echo 'Pipeline failed, check stage logs above.' }
    }
}

def waitHealthy(String container) {
    sh """
        for i in \$(seq 1 40); do
            s=\$(docker inspect -f '{{.State.Health.Status}}' ${container} 2>/dev/null || echo starting)
            echo "${container}: \$s"
            [ "\$s" = "healthy" ] && exit 0
            sleep 3
        done
        docker logs --tail 50 ${container} || true
        exit 1
    """
}